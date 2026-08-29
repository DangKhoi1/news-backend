import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from '../articles/entities/article.entity';
import { Bookmark } from './entities/bookmark.entity';
import { BookmarksController } from './bookmarks.controller';
import { BookmarksService } from './bookmarks.service';
@Module({
  imports: [TypeOrmModule.forFeature([Bookmark, Article])],
  controllers: [BookmarksController],
  providers: [BookmarksService],
})
export class BookmarksModule {}
