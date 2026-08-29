import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from '../articles/entities/article.entity';
import { Bookmark } from '../bookmarks/entities/bookmark.entity';
import { Comment } from '../comments/entities/comment.entity';
import { NewsletterSubscription } from '../newsletter/entities/newsletter-subscription.entity';
import { User } from '../users/entities/user.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Article,
      User,
      Comment,
      Bookmark,
      NewsletterSubscription,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
