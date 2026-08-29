import { IsString, Length } from 'class-validator';
export class UpdateCommentDto {
  @IsString() @Length(2, 2000) content: string;
}
