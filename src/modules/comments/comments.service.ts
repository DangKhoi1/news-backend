import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PaginatedResult } from '../../common/types/api-response.type';
import { AuthUser } from '../../common/types/auth-user.type';
import { rethrowServiceError } from '../../common/utils/error.util';
import { Article } from '../articles/entities/article.entity';
import { ArticleStatus } from '../articles/enums/article-status.enum';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Comment } from './entities/comment.entity';
import { CommentStatus } from './enums/comment-status.enum';
@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);
  constructor(
    @InjectRepository(Comment) private readonly comments: Repository<Comment>,
    @InjectRepository(Article) private readonly articles: Repository<Article>,
  ) {}
  async findApproved(
    articleId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<Comment>> {
    try {
      const safePage = Math.max(page, 1);
      const safeLimit = Math.min(Math.max(limit, 1), 100);
      const [items, total] = await this.comments.findAndCount({
        where: {
          articleId,
          status: CommentStatus.APPROVED,
          parentId: IsNull(),
        },
        relations: { user: true, replies: { user: true } },
        order: { createdAt: 'DESC', replies: { createdAt: 'ASC' } },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      });
      return {
        items,
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      };
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'findApproved');
    }
  }
  async create(
    articleId: string,
    dto: CreateCommentDto,
    user: AuthUser,
  ): Promise<Comment> {
    try {
      const article = await this.articles.findOne({
        where: { id: articleId, status: ArticleStatus.PUBLISHED },
      });
      if (!article) throw new NotFoundException('Không tìm thấy bài viết');
      if (!article.allowComments)
        throw new ForbiddenException('Bài viết đã tắt bình luận');
      if (dto.parentId) {
        const parent = await this.comments.findOne({
          where: { id: dto.parentId, articleId },
        });
        if (!parent)
          throw new NotFoundException('Không tìm thấy bình luận cha');
      }
      return await this.comments.save(
        this.comments.create({
          articleId,
          userId: user.id,
          content: dto.content.trim(),
          parentId: dto.parentId ?? null,
          status: CommentStatus.PENDING,
        }),
      );
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'create');
    }
  }
  async update(
    id: string,
    dto: UpdateCommentDto,
    user: AuthUser,
  ): Promise<Comment> {
    try {
      const comment = await this.comments.findOne({ where: { id } });
      if (!comment) throw new NotFoundException('Không tìm thấy bình luận');
      if (comment.userId !== user.id && user.role !== UserRole.ADMIN)
        throw new ForbiddenException('Bạn không thể sửa bình luận này');
      comment.content = dto.content.trim();
      comment.status = CommentStatus.PENDING;
      return await this.comments.save(comment);
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'update');
    }
  }
  async moderate(id: string, status: CommentStatus): Promise<Comment> {
    try {
      const comment = await this.comments.findOne({ where: { id } });
      if (!comment) throw new NotFoundException('Không tìm thấy bình luận');
      comment.status = status;
      return await this.comments.save(comment);
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'moderate');
    }
  }
  async remove(id: string, user: AuthUser): Promise<void> {
    try {
      const comment = await this.comments.findOne({ where: { id } });
      if (!comment) throw new NotFoundException('Không tìm thấy bình luận');
      if (comment.userId !== user.id && user.role !== UserRole.ADMIN)
        throw new ForbiddenException('Bạn không thể xóa bình luận này');
      await this.comments.remove(comment);
    } catch (error: unknown) {
      rethrowServiceError(error, this.logger, 'remove');
    }
  }
}
