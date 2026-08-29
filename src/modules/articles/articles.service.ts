import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import slugify from 'slugify';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { PaginatedResult } from '../../common/types/api-response.type';
import { AuthUser } from '../../common/types/auth-user.type';
import { rethrowServiceError } from '../../common/utils/error.util';
import { CategoriesService } from '../categories/categories.service';
import { SourcesService } from '../sources/sources.service';
import { TagsService } from '../tags/tags.service';
import { UserRole } from '../users/enums/user-role.enum';
import { ArticleQueryDto } from './dto/article-query.dto';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { Article } from './entities/article.entity';
import { ArticleStatus } from './enums/article-status.enum';

@Injectable()
export class ArticlesService {
  private readonly logger = new Logger(ArticlesService.name);
  constructor(
    @InjectRepository(Article) private readonly articles: Repository<Article>,
    private readonly categories: CategoriesService,
    private readonly sources: SourcesService,
    private readonly tags: TagsService,
  ) {}

  async findPublished(
    query: ArticleQueryDto,
  ): Promise<PaginatedResult<Article>> {
    try {
      return await this.executeList(
        this.buildListQuery(query).andWhere('article.status = :published', {
          published: ArticleStatus.PUBLISHED,
        }),
        query,
      );
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'findPublished');
    }
  }

  async findForManagement(
    query: ArticleQueryDto,
    user: AuthUser,
  ): Promise<PaginatedResult<Article>> {
    try {
      const builder = this.buildListQuery(query);
      if (query.status)
        builder.andWhere('article.status = :status', { status: query.status });
      if (user.role === UserRole.EDITOR)
        builder.andWhere('article.authorId = :authorId', { authorId: user.id });
      return await this.executeList(builder, query);
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'findForManagement');
    }
  }

  async findPublishedBySlug(
    slug: string,
    incrementView = true,
  ): Promise<Article> {
    try {
      const article = await this.articles.findOne({
        where: { slug, status: ArticleStatus.PUBLISHED },
        relations: { category: true, source: true, author: true, tags: true },
      });
      if (!article) throw new NotFoundException('Không tìm thấy bài viết');
      if (incrementView) {
        await this.articles.increment({ id: article.id }, 'viewCount', 1);
        article.viewCount = String(Number(article.viewCount) + 1);
      }
      return article;
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'findPublishedBySlug');
    }
  }

  async findOneForManagement(id: string, user: AuthUser): Promise<Article> {
    try {
      const article = await this.articles.findOne({
        where: { id },
        relations: { category: true, source: true, author: true, tags: true },
      });
      if (!article) throw new NotFoundException('Không tìm thấy bài viết');
      this.assertCanManage(article, user);
      return article;
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'findOneForManagement');
    }
  }

  async create(dto: CreateArticleDto, user: AuthUser): Promise<Article> {
    try {
      await this.categories.findOne(dto.categoryId);
      if (dto.sourceId) await this.sources.findOne(dto.sourceId);
      const slug = await this.uniqueSlug(dto.slug ?? dto.title);
      const tags = await this.tags.findByIds(dto.tagIds ?? []);
      const status = dto.status ?? ArticleStatus.DRAFT;
      const article = this.articles.create({
        ...dto,
        slug,
        tags,
        authorId: user.id,
        status,
        publishedAt: status === ArticleStatus.PUBLISHED ? new Date() : null,
        readingTimeMinutes: this.calculateReadingTime(dto.content),
        sourceId: dto.sourceId ?? null,
        thumbnailUrl: dto.thumbnailUrl ?? null,
        originalUrl: dto.originalUrl ?? null,
      });
      return await this.articles.save(article);
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'create');
    }
  }

  async update(
    id: string,
    dto: UpdateArticleDto,
    user: AuthUser,
  ): Promise<Article> {
    try {
      const article = await this.findOneForManagement(id, user);
      if (dto.categoryId) await this.categories.findOne(dto.categoryId);
      if (dto.sourceId) await this.sources.findOne(dto.sourceId);
      if (dto.slug || dto.title)
        article.slug = await this.uniqueSlug(
          dto.slug ?? dto.title ?? article.title,
          id,
        );
      if (dto.tagIds) article.tags = await this.tags.findByIds(dto.tagIds);
      const wasPublished = article.status === ArticleStatus.PUBLISHED;
      Object.assign(article, dto);
      if (dto.content)
        article.readingTimeMinutes = this.calculateReadingTime(dto.content);
      if (!wasPublished && dto.status === ArticleStatus.PUBLISHED)
        article.publishedAt = new Date();
      if (dto.status === ArticleStatus.DRAFT) article.publishedAt = null;
      return await this.articles.save(article);
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'update');
    }
  }

  async publish(id: string, user: AuthUser): Promise<Article> {
    try {
      const article = await this.findOneForManagement(id, user);
      article.status = ArticleStatus.PUBLISHED;
      article.publishedAt = article.publishedAt ?? new Date();
      return await this.articles.save(article);
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'publish');
    }
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    try {
      const article = await this.findOneForManagement(id, user);
      await this.articles.remove(article);
    } catch (error: unknown) {
      rethrowServiceError(error, this.logger, 'remove');
    }
  }

  async trending(limit = 10): Promise<Article[]> {
    try {
      const safeLimit = Math.min(Math.max(limit, 1), 30);
      return await this.articles.find({
        where: { status: ArticleStatus.PUBLISHED },
        relations: { category: true, source: true },
        order: { viewCount: 'DESC', publishedAt: 'DESC' },
        take: safeLimit,
      });
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'trending');
    }
  }

  async related(articleId: string, limit = 4): Promise<Article[]> {
    try {
      const article = await this.articles.findOne({
        where: { id: articleId },
        relations: { tags: true },
      });
      if (!article) throw new NotFoundException('Không tìm thấy bài viết');
      const qb = this.articles
        .createQueryBuilder('article')
        .leftJoinAndSelect('article.category', 'category')
        .leftJoin('article.tags', 'tag')
        .where('article.id != :articleId', { articleId })
        .andWhere('article.status = :status', {
          status: ArticleStatus.PUBLISHED,
        })
        .andWhere(
          new Brackets((inner) => {
            inner.where('article.categoryId = :categoryId', {
              categoryId: article.categoryId,
            });
            if (article.tags.length)
              inner.orWhere('tag.id IN (:...tagIds)', {
                tagIds: article.tags.map((tag) => tag.id),
              });
          }),
        )
        .orderBy('article.publishedAt', 'DESC')
        .take(Math.min(Math.max(limit, 1), 12));
      return await qb.getMany();
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'related');
    }
  }

  private buildListQuery(query: ArticleQueryDto): SelectQueryBuilder<Article> {
    try {
      const qb = this.articles
        .createQueryBuilder('article')
        .leftJoinAndSelect('article.category', 'category')
        .leftJoinAndSelect('article.source', 'source')
        .leftJoinAndSelect('article.author', 'author')
        .leftJoinAndSelect('article.tags', 'tag')
        .select([
          'article',
          'category',
          'source',
          'tag',
          'author.id',
          'author.displayName',
          'author.avatarUrl',
        ]);
      if (query.search?.trim()) {
        const searchTerm = query.search.trim();
        if (searchTerm.length <= 3) {
          const searchRegex = `(^|[^[:alnum:]_])${this.escapePostgresRegex(searchTerm)}([^[:alnum:]_]|$)`;
          qb.andWhere(
            "concat_ws(' ', article.title, article.summary, article.content) ~* :searchRegex",
            { searchRegex },
          );
        } else {
          qb.andWhere(
            new Brackets((inner) =>
              inner
                .where('article.title ILIKE :search', {
                  search: `%${searchTerm}%`,
                })
                .orWhere('article.summary ILIKE :search', {
                  search: `%${searchTerm}%`,
                })
                .orWhere('article.content ILIKE :search', {
                  search: `%${searchTerm}%`,
                }),
            ),
          );
        }
      }
      if (query.categoryId)
        qb.andWhere('article.categoryId = :categoryId', {
          categoryId: query.categoryId,
        });
      if (query.categorySlug)
        qb.andWhere('category.slug = :categorySlug', {
          categorySlug: query.categorySlug,
        });
      if (query.sourceId)
        qb.andWhere('article.sourceId = :sourceId', {
          sourceId: query.sourceId,
        });
      if (query.tagSlug)
        qb.andWhere('tag.slug = :tagSlug', { tagSlug: query.tagSlug });
      if (query.region)
        qb.andWhere('article.region = :region', { region: query.region });
      if (query.featured !== undefined)
        qb.andWhere('article.isFeatured = :featured', {
          featured: query.featured,
        });
      if (query.breaking !== undefined)
        qb.andWhere('article.isBreaking = :breaking', {
          breaking: query.breaking,
        });
      return qb
        .orderBy('article.isBreaking', 'DESC')
        .addOrderBy('article.publishedAt', 'DESC')
        .addOrderBy('article.createdAt', 'DESC');
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'buildListQuery');
    }
  }

  private escapePostgresRegex(value: string): string {
    try {
      return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'escapePostgresRegex');
    }
  }

  private async executeList(
    builder: SelectQueryBuilder<Article>,
    query: ArticleQueryDto,
  ): Promise<PaginatedResult<Article>> {
    try {
      const page = query.page ?? 1;
      const limit = query.limit ?? 12;
      const [items, total] = await builder
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();
      return {
        items,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'executeList');
    }
  }

  private async uniqueSlug(value: string, ignoreId?: string): Promise<string> {
    try {
      const base =
        slugify(value, { lower: true, strict: true, locale: 'vi' }) ||
        'bai-viet';
      let candidate = base;
      let counter = 1;
      while (
        await this.articles
          .createQueryBuilder('article')
          .where('article.slug = :candidate', { candidate })
          .andWhere(
            ignoreId ? 'article.id != :ignoreId' : '1=1',
            ignoreId ? { ignoreId } : {},
          )
          .getExists()
      )
        candidate = `${base}-${counter++}`;
      return candidate;
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'uniqueSlug');
    }
  }

  private calculateReadingTime(content: string): number {
    try {
      return Math.max(
        1,
        Math.ceil(
          content
            .replace(/<[^>]*>/g, ' ')
            .trim()
            .split(/\s+/)
            .filter(Boolean).length / 220,
        ),
      );
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'calculateReadingTime');
    }
  }
  private assertCanManage(article: Article, user: AuthUser): void {
    try {
      if (user.role !== UserRole.ADMIN && article.authorId !== user.id)
        throw new ForbiddenException(
          'Bạn chỉ có thể quản lý bài viết của mình',
        );
    } catch (error: unknown) {
      if (error instanceof ForbiddenException) throw error;
      rethrowServiceError(error, this.logger, 'assertCanManage');
    }
  }
}
