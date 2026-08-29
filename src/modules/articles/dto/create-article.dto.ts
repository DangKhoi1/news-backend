import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
} from 'class-validator';
import { ArticleRegion } from '../enums/article-region.enum';
import { ArticleStatus } from '../enums/article-status.enum';

export class CreateArticleDto {
  @IsString() @Length(10, 240) title: string;
  @IsOptional() @IsString() @Length(3, 260) slug?: string;
  @IsString() @Length(20, 600) summary: string;
  @IsString() @Length(100) content: string;
  @IsOptional() @IsUrl({ require_protocol: true }) thumbnailUrl?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) originalUrl?: string;
  @IsEnum(ArticleRegion) region: ArticleRegion;
  @IsOptional() @IsEnum(ArticleStatus) status?: ArticleStatus;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsBoolean() isBreaking?: boolean;
  @IsOptional() @IsBoolean() allowComments?: boolean;
  @IsUUID() categoryId: string;
  @IsOptional() @IsUUID() sourceId?: string;
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) tagIds?: string[];
}
