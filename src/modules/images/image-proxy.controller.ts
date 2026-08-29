import { Controller, Get, Query, Res } from '@nestjs/common';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { Response as ExpressResponse } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { ImageProxyService } from './image-proxy.service';

class ImageProxyQueryDto {
  @IsString()
  @MinLength(10)
  url!: string;

  @IsOptional()
  @IsString()
  v?: string;
}

@Controller('images')
export class ImageProxyController {
  constructor(private readonly service: ImageProxyService) {}

  @Public()
  @Get('proxy')
  async proxy(
    @Query() query: ImageProxyQueryDto,
    @Res() response: ExpressResponse,
  ): Promise<void> {
    try {
      const image = await this.service.load(query.url);
      response.setHeader('Content-Type', image.contentType);
      response.setHeader('Cache-Control', image.cacheControl);
      response.setHeader('X-Content-Type-Options', 'nosniff');
      response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      response.status(200).send(image.body);
    } catch (error: unknown) {
      throw error;
    }
  }
}
