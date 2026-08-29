import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateTagDto } from './dto/create-tag.dto';
import { TagsService } from './tags.service';
@Controller('tags')
export class TagsController {
  constructor(private readonly service: TagsService) {}
  @Public() @Get() async all(): Promise<{ data: unknown }> {
    try {
      return { data: await this.service.findAll() };
    } catch (error: unknown) {
      throw error;
    }
  }
  @Roles(UserRole.EDITOR, UserRole.ADMIN) @Post() async create(
    @Body() dto: CreateTagDto,
  ): Promise<{ message: string; data: unknown }> {
    try {
      return {
        message: 'Tạo thẻ thành công',
        data: await this.service.create(dto),
      };
    } catch (error: unknown) {
      throw error;
    }
  }
  @Roles(UserRole.ADMIN) @Delete(':id') async remove(
    @Param('id') id: string,
  ): Promise<{ message: string; data: null }> {
    try {
      await this.service.remove(id);
      return { message: 'Xóa thẻ thành công', data: null };
    } catch (error: unknown) {
      throw error;
    }
  }
}
