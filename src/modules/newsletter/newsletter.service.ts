import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import nodemailer, { Transporter } from 'nodemailer';
import { IsNull, LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { PaginatedResult } from '../../common/types/api-response.type';
import { rethrowServiceError } from '../../common/utils/error.util';
import { Article } from '../articles/entities/article.entity';
import { ArticleStatus } from '../articles/enums/article-status.enum';
import { NewsletterSubscription } from './entities/newsletter-subscription.entity';

const DIGEST_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const VIETNAM_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;
const DIGEST_ARTICLE_LIMIT = 8;
const SEND_BATCH_SIZE = 5;

export type NewsletterDeliveryResult = {
  status: 'sent' | 'disabled' | 'not_configured' | 'no_articles';
  articles: number;
  subscribers: number;
  sent: number;
  failed: number;
};

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);
  private transporter: Transporter | null = null;

  constructor(
    @InjectRepository(NewsletterSubscription)
    private readonly subscriptions: Repository<NewsletterSubscription>,
    @InjectRepository(Article)
    private readonly articles: Repository<Article>,
    private readonly config: ConfigService,
  ) {}

  async subscribe(email: string): Promise<NewsletterSubscription> {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const existing = await this.subscriptions.findOne({
        where: { email: normalizedEmail },
      });
      if (existing) {
        existing.isActive = true;
        return await this.subscriptions.save(existing);
      }
      return await this.subscriptions.save(
        this.subscriptions.create({
          email: normalizedEmail,
          isActive: true,
          unsubscribeToken: randomBytes(24).toString('hex'),
          lastDigestSentAt: null,
        }),
      );
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'subscribe');
    }
  }

  async unsubscribe(token: string): Promise<void> {
    try {
      const item = await this.subscriptions.findOne({
        where: { unsubscribeToken: token },
      });
      if (!item)
        throw new NotFoundException('Liên kết hủy đăng ký không hợp lệ');
      item.isActive = false;
      await this.subscriptions.save(item);
    } catch (error: unknown) {
      rethrowServiceError(error, this.logger, 'unsubscribe');
    }
  }

  async list(
    page = 1,
    limit = 50,
  ): Promise<PaginatedResult<NewsletterSubscription>> {
    try {
      const safePage = Math.max(page, 1);
      const safeLimit = Math.min(Math.max(limit, 1), 100);
      const [items, total] = await this.subscriptions.findAndCount({
        order: { createdAt: 'DESC' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      });
      return {
        items,
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      };
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'list');
    }
  }

  @Cron('0 0 7 * * *', {
    name: 'newsletter-daily-digest',
    timeZone: DIGEST_TIME_ZONE,
    waitForCompletion: true,
  })
  async scheduledDailyDigest(): Promise<void> {
    try {
      const result = await this.sendDailyDigest();
      this.logger.log(
        `Daily digest: status=${result.status}, articles=${result.articles}, subscribers=${result.subscribers}, sent=${result.sent}, failed=${result.failed}`,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Gửi newsletter định kỳ thất bại: ${this.errorMessage(error)}`,
      );
    }
  }

  async sendDailyDigest(): Promise<NewsletterDeliveryResult> {
    try {
      if (!this.asBoolean(this.config.get<string>('NEWSLETTER_ENABLED'), true))
        return this.emptyResult('disabled');

      const transporter = this.getTransporter();
      if (!transporter) {
        this.logger.warn(
          'Newsletter chưa gửi vì thiếu SMTP_HOST hoặc NEWSLETTER_FROM_EMAIL/SMTP_USER',
        );
        return this.emptyResult('not_configured');
      }

      const digestArticles = await this.articles.find({
        where: {
          status: ArticleStatus.PUBLISHED,
          publishedAt: MoreThanOrEqual(
            new Date(Date.now() - 24 * 60 * 60 * 1000),
          ),
        },
        relations: { category: true, source: true },
        order: { isBreaking: 'DESC', publishedAt: 'DESC' },
        take: DIGEST_ARTICLE_LIMIT,
      });
      if (!digestArticles.length) return this.emptyResult('no_articles');

      const startOfToday = this.startOfTodayInVietnam();
      const recipients = await this.subscriptions.find({
        where: [
          { isActive: true, lastDigestSentAt: IsNull() },
          { isActive: true, lastDigestSentAt: LessThan(startOfToday) },
        ],
        order: { createdAt: 'ASC' },
      });
      let sent = 0;
      let failed = 0;

      for (let index = 0; index < recipients.length; index += SEND_BATCH_SIZE) {
        const batch = recipients.slice(index, index + SEND_BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((recipient) =>
            this.sendDigestToRecipient(transporter, recipient, digestArticles),
          ),
        );
        for (const [resultIndex, result] of results.entries()) {
          const recipient = batch[resultIndex];
          if (result.status === 'fulfilled') {
            recipient.lastDigestSentAt = new Date();
            await this.subscriptions.save(recipient);
            sent += 1;
          } else {
            failed += 1;
            this.logger.error(
              `Không thể gửi newsletter tới ${this.maskEmail(recipient.email)}: ${this.errorMessage(result.reason)}`,
            );
          }
        }
      }

      return {
        status: 'sent',
        articles: digestArticles.length,
        subscribers: recipients.length,
        sent,
        failed,
      };
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'sendDailyDigest');
    }
  }

  private async sendDigestToRecipient(
    transporter: Transporter,
    recipient: NewsletterSubscription,
    articles: Article[],
  ): Promise<void> {
    const frontendUrl = this.config
      .get<string>('FRONTEND_URL', 'http://localhost:3000')
      .split(',')[0]
      .trim()
      .replace(/\/$/, '');
    const publicApiUrl = this.config
      .get<string>(
        'PUBLIC_API_URL',
        `http://localhost:${this.config.get<number>('PORT', 8081)}/api/v1`,
      )
      .replace(/\/$/, '');
    const unsubscribeUrl = `${publicApiUrl}/newsletter/unsubscribe/${encodeURIComponent(recipient.unsubscribeToken)}`;
    const fromEmail = this.config.get<string>(
      'NEWSLETTER_FROM_EMAIL',
      this.config.get<string>('SMTP_USER', ''),
    );
    const fromName = this.config.get<string>(
      'NEWSLETTER_FROM_NAME',
      'Nhịp Tin',
    );

    await transporter.sendMail({
      from: { name: fromName, address: fromEmail },
      to: recipient.email,
      subject: `Nhịp Tin 7 giờ · ${this.formatVietnamDate(new Date())}`,
      text: this.buildTextDigest(articles, frontendUrl, unsubscribeUrl),
      html: this.buildHtmlDigest(articles, frontendUrl, unsubscribeUrl),
    });
  }

  private getTransporter(): Transporter | null {
    if (this.transporter) return this.transporter;
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    const fromEmail =
      this.config.get<string>('NEWSLETTER_FROM_EMAIL')?.trim() ||
      this.config.get<string>('SMTP_USER')?.trim();
    if (!host || !fromEmail) return null;

    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASS');
    const port = this.config.get<number>('SMTP_PORT', 587);
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: this.asBoolean(
        this.config.get<string>('SMTP_SECURE'),
        port === 465,
      ),
      ...(user && pass ? { auth: { user, pass } } : {}),
    });
    return this.transporter;
  }

  private buildHtmlDigest(
    articles: Article[],
    frontendUrl: string,
    unsubscribeUrl: string,
  ): string {
    const articleCards = articles
      .map((article) => {
        const articleUrl = `${frontendUrl}/tin/${encodeURIComponent(article.slug)}`;
        const category = this.escapeHtml(article.category?.name ?? 'Tin mới');
        const source = this.escapeHtml(article.source?.name ?? 'Nhịp Tin');
        return `<tr><td style="padding:18px 0;border-bottom:1px solid #d8e3d5"><div style="margin-bottom:6px;color:#4e7142;font-size:11px;font-weight:700;text-transform:uppercase">${category} · ${source}</div><a href="${this.escapeHtml(articleUrl)}" style="color:#29332b;font-size:18px;font-weight:700;line-height:1.4;text-decoration:none">${this.escapeHtml(article.title)}</a><p style="margin:8px 0 0;color:#68746a;font-size:13px;line-height:1.6">${this.escapeHtml(article.summary)}</p></td></tr>`;
      })
      .join('');

    return `<!doctype html><html lang="vi"><body style="margin:0;background:#eef4ea;font-family:Arial,sans-serif;color:#29332b"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fbfcfa;border-radius:20px;padding:28px"><tr><td><div style="color:#4e7142;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Nhịp Tin · Bản tin 7 giờ</div><h1 style="margin:8px 0 6px;font-size:30px">Chào buổi sáng!</h1><p style="margin:0 0 18px;color:#68746a;line-height:1.6">Những tin đáng chú ý trong 24 giờ qua, ngắn gọn và có nguồn.</p></td></tr>${articleCards}<tr><td style="padding-top:24px;color:#68746a;font-size:11px;line-height:1.6">Bạn nhận email này vì đã đăng ký tại Nhịp Tin. <a href="${this.escapeHtml(unsubscribeUrl)}" style="color:#4e7142">Hủy đăng ký</a>.</td></tr></table></td></tr></table></body></html>`;
  }

  private buildTextDigest(
    articles: Article[],
    frontendUrl: string,
    unsubscribeUrl: string,
  ): string {
    const items = articles
      .map(
        (article, index) =>
          `${index + 1}. ${article.title}\n${article.summary}\n${frontendUrl}/tin/${encodeURIComponent(article.slug)}`,
      )
      .join('\n\n');
    return `NHỊP TIN · BẢN TIN 7 GIỜ\n\nNhững tin đáng chú ý trong 24 giờ qua:\n\n${items}\n\nHủy đăng ký: ${unsubscribeUrl}`;
  }

  private startOfTodayInVietnam(): Date {
    const vietnamNow = new Date(Date.now() + VIETNAM_UTC_OFFSET_MS);
    return new Date(
      Date.UTC(
        vietnamNow.getUTCFullYear(),
        vietnamNow.getUTCMonth(),
        vietnamNow.getUTCDate(),
      ) - VIETNAM_UTC_OFFSET_MS,
    );
  }

  private formatVietnamDate(value: Date): string {
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'short',
      timeZone: DIGEST_TIME_ZONE,
    }).format(value);
  }

  private emptyResult(
    status: Exclude<NewsletterDeliveryResult['status'], 'sent'>,
  ): NewsletterDeliveryResult {
    return { status, articles: 0, subscribers: 0, sent: 0, failed: 0 };
  }

  private asBoolean(value: string | undefined, fallback: boolean): boolean {
    return value === undefined
      ? fallback
      : value.trim().toLowerCase() === 'true';
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>'"]/g, (character) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      };
      return entities[character];
    });
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    return `${local.slice(0, 2)}***@${domain ?? 'unknown'}`;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
