import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResult } from '../../common/types/api-response.type';
import { rethrowServiceError } from '../../common/utils/error.util';
import { Article } from '../articles/entities/article.entity';
import { ArticleStatus } from '../articles/enums/article-status.enum';
import { Bookmark } from './entities/bookmark.entity';
@Injectable()
export class BookmarksService {
  private readonly logger = new Logger(BookmarksService.name);
  constructor(
    @InjectRepository(Bookmark)
    private readonly bookmarks: Repository<Bookmark>,
    @InjectRepository(Article) private readonly articles: Repository<Article>,
  ) {}
  async toggle(userId: string, articleId: string): Promise<{ saved: boolean }> {
    try {
      const article = await this.articles.findOne({
        where: { id: articleId, status: ArticleStatus.PUBLISHED },
      });
      if (!article) throw new NotFoundException('Không tìm thấy bài viết');
      const existing = await this.bookmarks.findOne({
        where: { userId, articleId },
      });
      if (existing) {
        await this.bookmarks.remove(existing);
        return { saved: false };
      }
      await this.bookmarks.save(this.bookmarks.create({ userId, articleId }));
      return { saved: true };
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'toggle');
    }
  }
  async findMine(
    userId: string,
    page = 1,
    limit = 12,
  ): Promise<PaginatedResult<Bookmark>> {
    try {
      const safePage = Math.max(page, 1);
      const safeLimit = Math.min(Math.max(limit, 1), 100);
      const [items, total] = await this.bookmarks.findAndCount({
        where: { userId },
        relations: { article: { category: true, source: true } },
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
      return rethrowServiceError(error, this.logger, 'findMine');
    }
  }
}
