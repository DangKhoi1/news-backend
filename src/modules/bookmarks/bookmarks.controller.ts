import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user.type';
import { BookmarksService } from './bookmarks.service';
@Controller('bookmarks')
export class BookmarksController {
  constructor(private readonly service: BookmarksService) {}
  @Post(':articleId/toggle') async toggle(
    @Param('articleId') articleId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ message: string; data: unknown }> {
    try {
      const data = await this.service.toggle(user.id, articleId);
      return {
        message: data.saved ? 'Đã lưu bài viết' : 'Đã bỏ lưu bài viết',
        data,
      };
    } catch (error: unknown) {
      throw error;
    }
  }
  @Get() async mine(
    @CurrentUser() user: AuthUser,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<{ data: unknown }> {
    try {
      return { data: await this.service.findMine(user.id, page, limit) };
    } catch (error: unknown) {
      throw error;
    }
  }
}
