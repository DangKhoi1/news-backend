import { IsOptional, IsString, Length } from 'class-validator';
export class CreateTagDto {
  @IsString() @Length(2, 80) name: string;
  @IsOptional() @IsString() @Length(2, 100) slug?: string;
}
