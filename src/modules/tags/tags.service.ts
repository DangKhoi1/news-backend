import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import slugify from 'slugify';
import { In, Repository } from 'typeorm';
import { rethrowServiceError } from '../../common/utils/error.util';
import { CreateTagDto } from './dto/create-tag.dto';
import { Tag } from './entities/tag.entity';
@Injectable()
export class TagsService {
  private readonly logger = new Logger(TagsService.name);
  constructor(@InjectRepository(Tag) private readonly tags: Repository<Tag>) {}
  async findAll(): Promise<Tag[]> {
    try {
      return await this.tags.find({ order: { name: 'ASC' } });
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'findAll');
    }
  }
  async findByIds(ids: string[]): Promise<Tag[]> {
    try {
      if (!ids.length) return [];
      const tags = await this.tags.findBy({ id: In(ids) });
      if (tags.length !== new Set(ids).size)
        throw new NotFoundException('Một hoặc nhiều thẻ không tồn tại');
      return tags;
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'findByIds');
    }
  }
  async create(dto: CreateTagDto): Promise<Tag> {
    try {
      const slug = slugify(dto.slug ?? dto.name, {
        lower: true,
        strict: true,
        locale: 'vi',
      });
      if (await this.tags.exists({ where: { slug } }))
        throw new ConflictException('Thẻ đã tồn tại');
      return await this.tags.save(
        this.tags.create({ name: dto.name.trim(), slug }),
      );
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'create');
    }
  }
  async remove(id: string): Promise<void> {
    try {
      const tag = await this.tags.findOne({ where: { id } });
      if (!tag) throw new NotFoundException('Không tìm thấy thẻ');
      await this.tags.remove(tag);
    } catch (error: unknown) {
      rethrowServiceError(error, this.logger, 'remove');
    }
  }
}
