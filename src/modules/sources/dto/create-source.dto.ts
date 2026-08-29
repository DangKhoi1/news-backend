import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  Length,
} from 'class-validator';
export class CreateSourceDto {
  @IsString() @Length(2, 120) name: string;
  @IsOptional() @IsString() @Length(2, 140) slug?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) websiteUrl?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) logoUrl?: string;
  @IsOptional() @IsBoolean() isVerified?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
