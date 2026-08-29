import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateSourceDto } from './dto/create-source.dto';
import { UpdateSourceDto } from './dto/update-source.dto';
import { SourcesService } from './sources.service';
@Controller('sources')
export class SourcesController {
  constructor(private readonly service: SourcesService) {}
  @Public() @Get() async all(
    @Query('includeInactive') value?: string,
  ): Promise<{ data: unknown }> {
    try {
      return { data: await this.service.findAll(value === 'true') };
    } catch (error: unknown) {
      throw error;
    }
  }
  @Roles(UserRole.EDITOR, UserRole.ADMIN) @Post() async create(
    @Body() dto: CreateSourceDto,
  ): Promise<{ message: string; data: unknown }> {
    try {
      return {
        message: 'Tạo nguồn tin thành công',
        data: await this.service.create(dto),
      };
    } catch (error: unknown) {
      throw error;
    }
  }
  @Roles(UserRole.EDITOR, UserRole.ADMIN) @Patch(':id') async update(
    @Param('id') id: string,
    @Body() dto: UpdateSourceDto,
  ): Promise<{ message: string; data: unknown }> {
    try {
      return {
        message: 'Cập nhật nguồn tin thành công',
        data: await this.service.update(id, dto),
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
      return { message: 'Xóa nguồn tin thành công', data: null };
    } catch (error: unknown) {
      throw error;
    }
  }
}
