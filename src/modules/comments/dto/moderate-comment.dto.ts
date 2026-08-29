import { IsEnum } from 'class-validator';
import { CommentStatus } from '../enums/comment-status.enum';
export class ModerateCommentDto {
  @IsEnum(CommentStatus) status: CommentStatus;
}
