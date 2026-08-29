import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ArticleRegion } from '../enums/article-region.enum';
import { ArticleStatus } from '../enums/article-status.enum';

export class ArticleQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsString() categorySlug?: string;
  @IsOptional() @IsUUID() sourceId?: string;
  @IsOptional() @IsString() tagSlug?: string;
  @IsOptional() @IsEnum(ArticleRegion) region?: ArticleRegion;
  @IsOptional() @IsEnum(ArticleStatus) status?: ArticleStatus;
  @IsOptional()
  @Transform(
    ({ value }: { value: unknown }) => value === 'true' || value === true,
  )
  @IsBoolean()
  featured?: boolean;
  @IsOptional()
  @Transform(
    ({ value }: { value: unknown }) => value === 'true' || value === true,
  )
  @IsBoolean()
  breaking?: boolean;
  @IsOptional() @Type(() => Number) sort?: number;
}
