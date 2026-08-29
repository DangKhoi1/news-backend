import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser } from '../../common/types/auth-user.type';
import { UserRole } from '../users/enums/user-role.enum';
import { ArticleQueryDto } from './dto/article-query.dto';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ArticlesService } from './articles.service';
@Controller('articles')
export class ArticlesController {
  constructor(private readonly service: ArticlesService) {}
  @Public() @Get() async list(
    @Query() query: ArticleQueryDto,
  ): Promise<{ data: unknown }> {
    try {
      return { data: await this.service.findPublished(query) };
    } catch (error: unknown) {
      throw error;
    }
  }
  @Public() @Get('trending') async trending(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<{ data: unknown }> {
    try {
      return { data: await this.service.trending(limit ?? 10) };
    } catch (error: unknown) {
      throw error;
    }
  }
  @Roles(UserRole.EDITOR, UserRole.ADMIN) @Get('manage') async manage(
    @Query() query: ArticleQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: unknown }> {
    try {
      return { data: await this.service.findForManagement(query, user) };
    } catch (error: unknown) {
      throw error;
    }
  }
  @Public() @Get('slug/:slug') async bySlug(
    @Param('slug') slug: string,
  ): Promise<{ data: unknown }> {
    try {
      return { data: await this.service.findPublishedBySlug(slug) };
    } catch (error: unknown) {
      throw error;
    }
  }
  @Public() @Get(':id/related') async related(
    @Param('id') id: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<{ data: unknown }> {
    try {
      return { data: await this.service.related(id, limit ?? 4) };
    } catch (error: unknown) {
      throw error;
    }
  }
  @Roles(UserRole.EDITOR, UserRole.ADMIN) @Get(':id/manage') async one(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: unknown }> {
    try {
      return { data: await this.service.findOneForManagement(id, user) };
    } catch (error: unknown) {
      throw error;
    }
  }
  @Roles(UserRole.EDITOR, UserRole.ADMIN) @Post() async create(
    @Body() dto: CreateArticleDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ message: string; data: unknown }> {
    try {
      return {
        message: 'Tạo bài viết thành công',
        data: await this.service.create(dto, user),
      };
    } catch (error: unknown) {
      throw error;
    }
  }
  @Roles(UserRole.EDITOR, UserRole.ADMIN) @Patch(':id') async update(
    @Param('id') id: string,
    @Body() dto: UpdateArticleDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ message: string; data: unknown }> {
    try {
      return {
        message: 'Cập nhật bài viết thành công',
        data: await this.service.update(id, dto, user),
      };
    } catch (error: unknown) {
      throw error;
    }
  }
  @Roles(UserRole.EDITOR, UserRole.ADMIN) @Post(':id/publish') async publish(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ message: string; data: unknown }> {
    try {
      return {
        message: 'Xuất bản bài viết thành công',
        data: await this.service.publish(id, user),
      };
    } catch (error: unknown) {
      throw error;
    }
  }
  @Roles(UserRole.EDITOR, UserRole.ADMIN) @Delete(':id') async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ message: string; data: null }> {
    try {
      await this.service.remove(id, user);
      return { message: 'Xóa bài viết thành công', data: null };
    } catch (error: unknown) {
      throw error;
    }
  }
}
