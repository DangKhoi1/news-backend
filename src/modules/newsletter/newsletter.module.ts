import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from '../articles/entities/article.entity';
import { NewsletterSubscription } from './entities/newsletter-subscription.entity';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';
@Module({
  imports: [TypeOrmModule.forFeature([NewsletterSubscription, Article])],
  controllers: [NewsletterController],
  providers: [NewsletterService],
})
export class NewsletterModule {}
