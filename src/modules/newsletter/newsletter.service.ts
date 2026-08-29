import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { PaginatedResult } from '../../common/types/api-response.type';
import { rethrowServiceError } from '../../common/utils/error.util';
import { NewsletterSubscription } from './entities/newsletter-subscription.entity';
@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);
  constructor(
    @InjectRepository(NewsletterSubscription)
    private readonly subscriptions: Repository<NewsletterSubscription>,
  ) {}
  async subscribe(email: string): Promise<NewsletterSubscription> {
    try {
      const existing = await this.subscriptions.findOne({ where: { email } });
      if (existing) {
        existing.isActive = true;
        return await this.subscriptions.save(existing);
      }
      return await this.subscriptions.save(
        this.subscriptions.create({
          email,
          isActive: true,
          unsubscribeToken: randomBytes(24).toString('hex'),
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
}
