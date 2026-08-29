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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}
  @Public() @Get() async all(
    @Query('includeInactive') includeInactive?: string,
  ): Promise<{ data: unknown }> {
    try {
      return { data: await this.service.findAll(includeInactive === 'true') };
    } catch (error: unknown) {
      throw error;
    }
  }
  @Public() @Get(':id') async one(
    @Param('id') id: string,
  ): Promise<{ data: unknown }> {
    try {
      return { data: await this.service.findOne(id) };
    } catch (error: unknown) {
      throw error;
    }
  }
  @Roles(UserRole.ADMIN) @Post() async create(
    @Body() dto: CreateCategoryDto,
  ): Promise<{ message: string; data: unknown }> {
    try {
      return {
        message: 'Tạo chuyên mục thành công',
        data: await this.service.create(dto),
      };
    } catch (error: unknown) {
      throw error;
    }
  }
  @Roles(UserRole.ADMIN) @Patch(':id') async update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<{ message: string; data: unknown }> {
    try {
      return {
        message: 'Cập nhật chuyên mục thành công',
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
      return { message: 'Xóa chuyên mục thành công', data: null };
    } catch (error: unknown) {
      throw error;
    }
  }
}
