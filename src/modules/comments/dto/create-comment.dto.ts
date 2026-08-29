import { IsOptional, IsString, IsUUID, Length } from 'class-validator';
export class CreateCommentDto {
  @IsString() @Length(2, 2000) content: string;
  @IsOptional() @IsUUID() parentId?: string;
}
