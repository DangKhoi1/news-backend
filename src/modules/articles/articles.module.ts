import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesModule } from '../categories/categories.module';
import { SourcesModule } from '../sources/sources.module';
import { TagsModule } from '../tags/tags.module';
import { Article } from './entities/article.entity';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([Article]),
    CategoriesModule,
    SourcesModule,
    TagsModule,
  ],
  controllers: [ArticlesController],
  providers: [ArticlesService],
  exports: [ArticlesService, TypeOrmModule],
})
export class ArticlesModule {}
