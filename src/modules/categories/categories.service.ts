import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import slugify from 'slugify';
import { Repository } from 'typeorm';
import { rethrowServiceError } from '../../common/utils/error.util';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);
  constructor(
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
  ) {}

  async findAll(includeInactive = false): Promise<Category[]> {
    try {
      return await this.categories.find({
        where: includeInactive ? {} : { isActive: true },
        order: { sortOrder: 'ASC', name: 'ASC' },
      });
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'findAll');
    }
  }
  async findOne(id: string): Promise<Category> {
    try {
      const item = await this.categories.findOne({ where: { id } });
      if (!item) throw new NotFoundException('Không tìm thấy chuyên mục');
      return item;
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'findOne');
    }
  }
  async create(dto: CreateCategoryDto): Promise<Category> {
    try {
      const slug = this.normalizeSlug(dto.slug ?? dto.name);
      if (await this.categories.exists({ where: { slug } }))
        throw new ConflictException('Slug chuyên mục đã tồn tại');
      return await this.categories.save(
        this.categories.create({ ...dto, name: dto.name.trim(), slug }),
      );
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'create');
    }
  }
  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    try {
      const item = await this.findOne(id);
      const slug =
        dto.slug || dto.name
          ? this.normalizeSlug(dto.slug ?? dto.name ?? item.name)
          : item.slug;
      if (
        slug !== item.slug &&
        (await this.categories.exists({ where: { slug } }))
      )
        throw new ConflictException('Slug chuyên mục đã tồn tại');
      Object.assign(item, dto, { slug });
      return await this.categories.save(item);
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'update');
    }
  }
  async remove(id: string): Promise<void> {
    try {
      const item = await this.categories.findOne({
        where: { id },
        relations: { articles: true },
      });
      if (!item) throw new NotFoundException('Không tìm thấy chuyên mục');
      if (item.articles.length)
        throw new ConflictException(
          'Không thể xóa chuyên mục đang có bài viết',
        );
      await this.categories.remove(item);
    } catch (error: unknown) {
      rethrowServiceError(error, this.logger, 'remove');
    }
  }
  private normalizeSlug(value: string): string {
    try {
      return slugify(value, { lower: true, strict: true, locale: 'vi' });
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'normalizeSlug');
    }
  }
}
