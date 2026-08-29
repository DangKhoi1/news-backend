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
import { CreateSourceDto } from './dto/create-source.dto';
import { UpdateSourceDto } from './dto/update-source.dto';
import { Source } from './entities/source.entity';
@Injectable()
export class SourcesService {
  private readonly logger = new Logger(SourcesService.name);
  constructor(
    @InjectRepository(Source) private readonly sources: Repository<Source>,
  ) {}
  async findAll(includeInactive = false): Promise<Source[]> {
    try {
      return await this.sources.find({
        where: includeInactive ? {} : { isActive: true },
        order: { name: 'ASC' },
      });
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'findAll');
    }
  }
  async findOne(id: string): Promise<Source> {
    try {
      const source = await this.sources.findOne({ where: { id } });
      if (!source) throw new NotFoundException('Không tìm thấy nguồn tin');
      return source;
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'findOne');
    }
  }
  async create(dto: CreateSourceDto): Promise<Source> {
    try {
      const slug = slugify(dto.slug ?? dto.name, {
        lower: true,
        strict: true,
        locale: 'vi',
      });
      if (await this.sources.exists({ where: { slug } }))
        throw new ConflictException('Nguồn tin đã tồn tại');
      return await this.sources.save(
        this.sources.create({ ...dto, name: dto.name.trim(), slug }),
      );
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'create');
    }
  }
  async update(id: string, dto: UpdateSourceDto): Promise<Source> {
    try {
      const source = await this.findOne(id);
      const slug =
        dto.slug || dto.name
          ? slugify(dto.slug ?? dto.name ?? source.name, {
              lower: true,
              strict: true,
              locale: 'vi',
            })
          : source.slug;
      if (
        slug !== source.slug &&
        (await this.sources.exists({ where: { slug } }))
      )
        throw new ConflictException('Slug nguồn tin đã tồn tại');
      Object.assign(source, dto, { slug });
      return await this.sources.save(source);
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'update');
    }
  }
  async remove(id: string): Promise<void> {
    try {
      const source = await this.sources.findOne({
        where: { id },
        relations: { articles: true },
      });
      if (!source) throw new NotFoundException('Không tìm thấy nguồn tin');
      if (source.articles.length)
        throw new ConflictException('Không thể xóa nguồn đang có bài viết');
      await this.sources.remove(source);
    } catch (error: unknown) {
      rethrowServiceError(error, this.logger, 'remove');
    }
  }
}
