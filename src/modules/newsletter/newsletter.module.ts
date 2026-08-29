import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsletterSubscription } from './entities/newsletter-subscription.entity';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';
@Module({
  imports: [TypeOrmModule.forFeature([NewsletterSubscription])],
  controllers: [NewsletterController],
  providers: [NewsletterService],
})
export class NewsletterModule {}
