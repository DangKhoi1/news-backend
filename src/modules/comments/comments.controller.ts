import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser } from '../../common/types/auth-user.type';
import { UserRole } from '../users/enums/user-role.enum';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ModerateCommentDto } from './dto/moderate-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
@Controller('comments')
export class CommentsController {
  constructor(private readonly service: CommentsService) {}
  @Public() @Get('article/:articleId') async list(
    @Param('articleId', new ParseUUIDPipe({ version: '4' })) articleId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<{ data: unknown }> {
    try {
      return { data: await this.service.findApproved(articleId, page, limit) };
    } catch (error: unknown) {
      throw error;
    }
  }
  @Post('article/:articleId') async create(
    @Param('articleId', new ParseUUIDPipe({ version: '4' })) articleId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ message: string; data: unknown }> {
    try {
      return {
        message: 'Bình luận đang chờ kiểm duyệt',
        data: await this.service.create(articleId, dto, user),
      };
    } catch (error: unknown) {
      throw error;
    }
  }
  @Patch(':id') async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ message: string; data: unknown }> {
    try {
      return {
        message: 'Cập nhật bình luận thành công',
        data: await this.service.update(id, dto, user),
      };
    } catch (error: unknown) {
      throw error;
    }
  }
  @Roles(UserRole.EDITOR, UserRole.ADMIN) @Patch(':id/moderate') async moderate(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ModerateCommentDto,
  ): Promise<{ message: string; data: unknown }> {
    try {
      return {
        message: 'Kiểm duyệt bình luận thành công',
        data: await this.service.moderate(id, dto.status),
      };
    } catch (error: unknown) {
      throw error;
    }
  }
  @Delete(':id') async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ message: string; data: null }> {
    try {
      await this.service.remove(id, user);
      return { message: 'Xóa bình luận thành công', data: null };
    } catch (error: unknown) {
      throw error;
    }
  }
}
