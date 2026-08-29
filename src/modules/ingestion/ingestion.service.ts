import { createHash } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import slugify from 'slugify';
import { XMLParser } from 'fast-xml-parser';
import { decode } from 'html-entities';
import { Repository } from 'typeorm';
import { rethrowServiceError } from '../../common/utils/error.util';
import { Article } from '../articles/entities/article.entity';
import { ArticleStatus } from '../articles/enums/article-status.enum';
import { Category } from '../categories/entities/category.entity';
import { Source } from '../sources/entities/source.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { NewsFeed } from './entities/news-feed.entity';
import { DEFAULT_NEWS_FEEDS, FeedDefinition } from './feeds.config';
import {
  FeedSyncResult,
  IngestionRuntimeStatus,
  IngestionSyncResult,
  ParsedFeedItem,
} from './ingestion.types';

type ArticleMetadata = { description: string | null; imageUrl: string | null };

@Injectable()
export class IngestionService implements OnApplicationBootstrap {
  private readonly logger = new Logger(IngestionService.name);
  private readonly xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    processEntities: false,
    trimValues: true,
  });
  private running = false;
  private lastRun: IngestionSyncResult | null = null;

  constructor(
    @InjectRepository(NewsFeed)
    private readonly feedsRepository: Repository<NewsFeed>,
    @InjectRepository(Article)
    private readonly articlesRepository: Repository<Article>,
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    @InjectRepository(Source)
    private readonly sourcesRepository: Repository<Source>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.ensureDefaultFeeds();
      if (
        this.isEnabled(this.config.get<unknown>('NEWS_SYNC_ON_START', false))
      ) {
        void this.syncAll('startup').catch((error: unknown) =>
          this.logger.error(
            `Đồng bộ lúc khởi động thất bại: ${this.errorMessage(error)}`,
          ),
        );
      }
    } catch (error: unknown) {
      this.logger.error(
        `Khởi tạo nguồn RSS thất bại: ${this.errorMessage(error)}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES, {
    name: 'news-feed-sync',
    waitForCompletion: true,
  })
  async scheduledSync(): Promise<void> {
    try {
      if (!this.isEnabled(this.config.get<unknown>('NEWS_SYNC_ENABLED', true)))
        return;
      await this.syncAll('scheduled');
    } catch (error: unknown) {
      this.logger.error(
        `Đồng bộ RSS định kỳ thất bại: ${this.errorMessage(error)}`,
      );
    }
  }

  async syncAll(
    trigger: IngestionSyncResult['trigger'] = 'manual',
  ): Promise<IngestionSyncResult> {
    let acquiredSyncLock = false;
    try {
      if (this.running)
        throw new ConflictException('Một tiến trình đồng bộ đang chạy');
      this.running = true;
      acquiredSyncLock = true;
      const startedAt = new Date();
      await this.ensureDefaultFeeds();
      const feeds = await this.feedsRepository.find({
        where: { isActive: true },
        order: { name: 'ASC' },
      });
      const results: FeedSyncResult[] = [];
      for (const feed of feeds) results.push(await this.syncFeed(feed));
      const result: IngestionSyncResult = {
        trigger,
        startedAt: startedAt.toISOString(),
        completedAt: new Date().toISOString(),
        imported: results.reduce((sum, item) => sum + item.imported, 0),
        skipped: results.reduce((sum, item) => sum + item.skipped, 0),
        failed: results.reduce((sum, item) => sum + item.failed, 0),
        feeds: results,
      };
      this.lastRun = result;
      this.logger.log(
        `Đồng bộ hoàn tất: ${result.imported} mới, ${result.skipped} trùng, ${result.failed} lỗi`,
      );
      return result;
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'syncAll');
    } finally {
      if (acquiredSyncLock) this.running = false;
    }
  }

  async getStatus(): Promise<{
    runtime: IngestionRuntimeStatus;
    feeds: NewsFeed[];
  }> {
    try {
      return {
        runtime: { running: this.running, lastRun: this.lastRun },
        feeds: await this.feedsRepository.find({ order: { name: 'ASC' } }),
      };
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'getStatus');
    }
  }

  private async syncFeed(feed: NewsFeed): Promise<FeedSyncResult> {
    let imported = 0;
    let skipped = 0;
    let failed = 0;
    try {
      const definition = this.feedDefinition(feed);
      const [category, source, author] = await Promise.all([
        this.ensureCategory(definition),
        this.ensureSource(definition),
        this.findIngestionAuthor(),
      ]);
      const xml = await this.fetchText(feed.url, 'application/rss+xml');
      const parsed = this.parseFeed(xml);
      const limit = this.syncLimit();
      for (const item of parsed.slice(0, limit)) {
        try {
          const outcome = await this.saveItem(
            item,
            definition,
            category,
            source,
            author,
          );
          if (outcome === 'imported') imported += 1;
          else skipped += 1;
        } catch (error: unknown) {
          failed += 1;
          this.logger.warn(
            `Bỏ qua bài từ ${feed.name}: ${this.errorMessage(error)}`,
          );
        }
      }
      feed.lastSyncedAt = new Date();
      feed.lastSuccessAt = new Date();
      feed.lastImportedCount = imported;
      feed.lastError = null;
      await this.feedsRepository.save(feed);
      return {
        feedId: feed.id,
        feedName: feed.name,
        imported,
        skipped,
        failed,
        error: null,
      };
    } catch (error: unknown) {
      const message = this.errorMessage(error);
      feed.lastSyncedAt = new Date();
      feed.lastImportedCount = imported;
      feed.lastError = message.slice(0, 2000);
      await this.feedsRepository.save(feed).catch(() => undefined);
      this.logger.error(`Nguồn ${feed.name} thất bại: ${message}`);
      return {
        feedId: feed.id,
        feedName: feed.name,
        imported,
        skipped,
        failed: failed + 1,
        error: message,
      };
    }
  }

  private async saveItem(
    item: ParsedFeedItem,
    definition: FeedDefinition,
    category: Category,
    source: Source,
    author: User,
  ): Promise<'imported' | 'skipped'> {
    try {
      const link = this.safeHttpUrl(item.link);
      if (!link) throw new Error('URL bài viết không hợp lệ');
      const cleanTitle = this.cleanText(item.title).slice(0, 240);
      const slug = this.articleSlug(cleanTitle, link);
      const existing = await this.articlesRepository.findOne({
        where: [{ originalUrl: link }, { slug }],
      });
      let summary = this.cleanText(item.description).slice(0, 900);
      let imageUrl = this.safeHttpUrl(item.imageUrl);
      if (!imageUrl || summary.length < 100) {
        const metadata = await this.fetchArticleMetadata(link);
        imageUrl = imageUrl ?? this.safeHttpUrl(metadata.imageUrl);
        const metadataDescription = this.cleanText(metadata.description ?? '');
        if (metadataDescription.length > summary.length)
          summary = metadataDescription.slice(0, 900);
      }
      if (!summary)
        summary = `Tin mới được cập nhật từ ${definition.sourceName}.`;
      if (existing) {
        let changed = false;
        if (cleanTitle && existing.title !== cleanTitle) {
          existing.title = cleanTitle;
          changed = true;
        }
        if (existing.slug !== slug) {
          existing.slug = slug;
          changed = true;
        }
        if (imageUrl && existing.thumbnailUrl !== imageUrl) {
          existing.thumbnailUrl = imageUrl;
          changed = true;
        }
        if (summary && existing.summary !== summary) {
          existing.summary = summary;
          existing.content = this.buildContent(summary, definition.sourceName);
          changed = true;
        }
        if (changed) await this.articlesRepository.save(existing);
        return 'skipped';
      }
      const ageHours =
        (Date.now() - item.publishedAt.getTime()) / (60 * 60 * 1000);
      const article = this.articlesRepository.create({
        title: cleanTitle,
        slug,
        summary,
        content: this.buildContent(summary, definition.sourceName),
        thumbnailUrl: imageUrl,
        originalUrl: link,
        region: definition.region,
        status: ArticleStatus.PUBLISHED,
        isFeatured: ageHours <= 6,
        isBreaking:
          ageHours <= 3 &&
          /khẩn|mới nhất|trực tiếp|bão|động đất|cảnh báo/i.test(item.title),
        allowComments: true,
        readingTimeMinutes: Math.max(
          1,
          Math.ceil(summary.split(/\s+/).filter(Boolean).length / 220),
        ),
        viewCount: '0',
        publishedAt: item.publishedAt,
        categoryId: category.id,
        category,
        sourceId: source.id,
        source,
        authorId: author.id,
        author,
        tags: [],
      });
      await this.articlesRepository.save(article);
      return 'imported';
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'saveItem');
    }
  }

  private parseFeed(xml: string): ParsedFeedItem[] {
    try {
      const document: unknown = this.xmlParser.parse(xml);
      const root = this.asRecord(document);
      const rss = this.asRecord(root.rss);
      const channel = this.asRecord(rss.channel);
      const rawItems = this.asArray(channel.item);
      const parsed: ParsedFeedItem[] = [];
      for (const value of rawItems) {
        const item = this.asRecord(value);
        const title = this.valueText(item.title);
        const link = this.valueText(item.link);
        if (!title || !link) continue;
        const description =
          this.valueText(item.description) ||
          this.valueText(item['content:encoded']);
        parsed.push({
          title,
          link,
          description,
          imageUrl: this.extractFeedImage(item, description),
          publishedAt: this.parseDate(
            this.valueText(item.pubDate) ||
              this.valueText(item.published) ||
              this.valueText(item.updated),
          ),
        });
      }
      return parsed;
    } catch (error: unknown) {
      throw new Error(`RSS XML không hợp lệ: ${this.errorMessage(error)}`);
    }
  }

  private extractFeedImage(
    item: Record<string, unknown>,
    description: string,
  ): string | null {
    try {
      const candidates = [
        item['media:content'],
        item['media:thumbnail'],
        item.enclosure,
      ];
      for (const candidate of candidates) {
        for (const value of this.asArray(candidate)) {
          const record = this.asRecord(value);
          const url = this.valueText(record['@_url']);
          const type = this.valueText(record['@_type']);
          if (url && (!type || type.startsWith('image/'))) return url;
        }
      }
      const match = description.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
      return match?.[1] ?? null;
    } catch {
      return null;
    }
  }

  private async fetchArticleMetadata(url: string): Promise<ArticleMetadata> {
    try {
      const html = await this.fetchText(url, 'text/html');
      return {
        imageUrl: this.extractMeta(html, 'og:image'),
        description:
          this.extractMeta(html, 'description') ??
          this.extractMeta(html, 'og:description'),
      };
    } catch {
      return { imageUrl: null, description: null };
    }
  }

  private async fetchText(url: string, accept: string): Promise<string> {
    try {
      const timeoutMs = this.fetchTimeout();
      const response = await fetch(url, {
        headers: {
          Accept: accept,
          'User-Agent':
            'NhipTinRSSReader/1.0 (+http://localhost:3000; contact: admin@nhiptin.vn)',
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok)
        throw new Error(`HTTP ${response.status} khi tải ${url}`);
      return await response.text();
    } catch (error: unknown) {
      throw new Error(`Không thể tải ${url}: ${this.errorMessage(error)}`);
    }
  }

  private async ensureDefaultFeeds(): Promise<void> {
    try {
      for (const definition of DEFAULT_NEWS_FEEDS) {
        const existing = await this.feedsRepository.findOne({
          where: { url: definition.url },
        });
        if (existing) continue;
        await this.feedsRepository.save(
          this.feedsRepository.create({
            name: definition.name,
            url: definition.url,
            sourceName: definition.sourceName,
            sourceSlug: definition.sourceSlug,
            websiteUrl: definition.websiteUrl,
            categorySlug: definition.categorySlug,
            region: definition.region,
            isActive: true,
            lastSyncedAt: null,
            lastSuccessAt: null,
            lastError: null,
            lastImportedCount: 0,
          }),
        );
      }
    } catch (error: unknown) {
      rethrowServiceError(error, this.logger, 'ensureDefaultFeeds');
    }
  }

  private async ensureCategory(definition: FeedDefinition): Promise<Category> {
    try {
      const existing = await this.categoriesRepository.findOne({
        where: { slug: definition.categorySlug },
      });
      if (existing) return existing;
      return await this.categoriesRepository.save(
        this.categoriesRepository.create({
          name: definition.categoryName,
          slug: definition.categorySlug,
          description: `Tin ${definition.categoryName.toLowerCase()} được tổng hợp từ các nguồn RSS chính thức.`,
          isActive: true,
          sortOrder: 99,
        }),
      );
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'ensureCategory');
    }
  }

  private async ensureSource(definition: FeedDefinition): Promise<Source> {
    try {
      const existing = await this.sourcesRepository.findOne({
        where: { slug: definition.sourceSlug },
      });
      if (existing) return existing;
      return await this.sourcesRepository.save(
        this.sourcesRepository.create({
          name: definition.sourceName,
          slug: definition.sourceSlug,
          websiteUrl: definition.websiteUrl,
          logoUrl: null,
          isVerified: true,
          isActive: true,
        }),
      );
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'ensureSource');
    }
  }

  private async findIngestionAuthor(): Promise<User> {
    try {
      const admin = await this.usersRepository.findOne({
        where: { role: UserRole.ADMIN, isActive: true },
        order: { createdAt: 'ASC' },
      });
      if (!admin)
        throw new Error(
          'Chưa có tài khoản admin. Hãy chạy npm run seed trước.',
        );
      return admin;
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'findIngestionAuthor');
    }
  }

  private feedDefinition(feed: NewsFeed): FeedDefinition {
    try {
      const configured = DEFAULT_NEWS_FEEDS.find(
        (item) => item.url === feed.url,
      );
      if (configured) return configured;
      return {
        name: feed.name,
        url: feed.url,
        sourceName: feed.sourceName,
        sourceSlug: feed.sourceSlug,
        websiteUrl: feed.websiteUrl,
        categoryName: feed.categorySlug,
        categorySlug: feed.categorySlug,
        region: feed.region,
      };
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'feedDefinition');
    }
  }

  private extractMeta(html: string, key: string): string | null {
    try {
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const patterns = [
        new RegExp(
          `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`,
          'i',
        ),
        new RegExp(
          `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`,
          'i',
        ),
      ];
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match?.[1]) return this.decodeEntities(match[1]);
      }
      return null;
    } catch {
      return null;
    }
  }

  private cleanText(value: string): string {
    try {
      return this.decodeEntities(
        value
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<[^>]+>/g, ' '),
      )
        .replace(/\s+/g, ' ')
        .trim();
    } catch {
      return value.trim();
    }
  }

  private decodeEntities(value: string): string {
    try {
      return decode(value, { level: 'html5', scope: 'body' });
    } catch {
      return value;
    }
  }

  private buildContent(summary: string, sourceName: string): string {
    try {
      return `${summary}\n\nBản tin được Nhịp Tin tổng hợp tự động từ RSS chính thức của ${sourceName}. Độc giả có thể mở liên kết nguồn ở cuối bài để đọc nội dung đầy đủ và cập nhật mới nhất.`;
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'buildContent');
    }
  }

  private articleSlug(title: string, link: string): string {
    try {
      const base =
        slugify(title, { lower: true, strict: true, locale: 'vi' }) ||
        'tin-moi';
      const hash = createHash('sha1').update(link).digest('hex').slice(0, 8);
      return `${base.slice(0, 245)}-${hash}`;
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'articleSlug');
    }
  }

  private parseDate(value: string): Date {
    try {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? new Date() : date;
    } catch {
      return new Date();
    }
  }

  private safeHttpUrl(value: string | null): string | null {
    try {
      if (!value) return null;
      const decodedValue = this.decodeEntities(value).trim();
      const normalized = decodedValue.startsWith('//')
        ? `https:${decodedValue}`
        : decodedValue;
      const parsed = new URL(normalized);
      return ['http:', 'https:'].includes(parsed.protocol)
        ? parsed.toString()
        : null;
    } catch {
      return null;
    }
  }

  private valueText(value: unknown): string {
    try {
      if (typeof value === 'string' || typeof value === 'number')
        return String(value).trim();
      const record = this.asRecord(value);
      const text = record['#text'];
      return typeof text === 'string' || typeof text === 'number'
        ? String(text).trim()
        : '';
    } catch {
      return '';
    }
  }

  private asRecord(value: unknown): Record<string, unknown> {
    try {
      return typeof value === 'object' && value !== null
        ? (value as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  private asArray(value: unknown): unknown[] {
    try {
      if (Array.isArray(value)) return value;
      return value === undefined || value === null ? [] : [value];
    } catch {
      return [];
    }
  }

  private isEnabled(value: unknown): boolean {
    try {
      return value === true || String(value).toLowerCase() === 'true';
    } catch {
      return false;
    }
  }

  private syncLimit(): number {
    try {
      const value = Number(this.config.get('NEWS_SYNC_LIMIT_PER_FEED', 12));
      return Number.isInteger(value) ? Math.min(Math.max(value, 1), 30) : 12;
    } catch {
      return 12;
    }
  }

  private fetchTimeout(): number {
    try {
      const value = Number(this.config.get('NEWS_FETCH_TIMEOUT_MS', 12_000));
      return Number.isInteger(value)
        ? Math.min(Math.max(value, 3000), 30_000)
        : 12_000;
    } catch {
      return 12_000;
    }
  }

  private errorMessage(error: unknown): string {
    try {
      return error instanceof Error ? error.message : String(error);
    } catch {
      return 'Lỗi không xác định';
    }
  }
}
