import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { rethrowServiceError } from '../../common/utils/error.util';
import { Article } from '../articles/entities/article.entity';
import { ArticleStatus } from '../articles/enums/article-status.enum';
import { Bookmark } from '../bookmarks/entities/bookmark.entity';
import { Comment } from '../comments/entities/comment.entity';
import { CommentStatus } from '../comments/enums/comment-status.enum';
import { NewsletterSubscription } from '../newsletter/entities/newsletter-subscription.entity';
import { User } from '../users/entities/user.entity';
export interface DashboardSummary {
  articles: { total: number; published: number; draft: number };
  users: number;
  pendingComments: number;
  bookmarks: number;
  activeSubscribers: number;
  topArticles: Array<{
    id: string;
    title: string;
    slug: string;
    viewCount: string;
  }>;
}
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  constructor(
    @InjectRepository(Article) private readonly articles: Repository<Article>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Comment) private readonly comments: Repository<Comment>,
    @InjectRepository(Bookmark)
    private readonly bookmarks: Repository<Bookmark>,
    @InjectRepository(NewsletterSubscription)
    private readonly subscribers: Repository<NewsletterSubscription>,
  ) {}
  async summary(): Promise<DashboardSummary> {
    try {
      const [
        total,
        published,
        draft,
        users,
        pendingComments,
        bookmarks,
        activeSubscribers,
        topArticles,
      ] = await Promise.all([
        this.articles.count(),
        this.articles.countBy({ status: ArticleStatus.PUBLISHED }),
        this.articles.countBy({ status: ArticleStatus.DRAFT }),
        this.users.countBy({ isActive: true }),
        this.comments.countBy({ status: CommentStatus.PENDING }),
        this.bookmarks.count(),
        this.subscribers.countBy({ isActive: true }),
        this.articles.find({
          where: { status: ArticleStatus.PUBLISHED },
          select: { id: true, title: true, slug: true, viewCount: true },
          order: { viewCount: 'DESC' },
          take: 10,
        }),
      ]);
      return {
        articles: { total, published, draft },
        users,
        pendingComments,
        bookmarks,
        activeSubscribers,
        topArticles,
      };
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'summary');
    }
  }
}
