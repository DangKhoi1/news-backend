import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { SubscribeDto } from './dto/subscribe.dto';
import { NewsletterService } from './newsletter.service';
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly service: NewsletterService) {}
  @Public() @Post('subscribe') async subscribe(
    @Body() dto: SubscribeDto,
  ): Promise<{ message: string; data: unknown }> {
    try {
      const item = await this.service.subscribe(dto.email);
      return {
        message: 'Đăng ký nhận bản tin thành công',
        data: { email: item.email, isActive: item.isActive },
      };
    } catch (error: unknown) {
      throw error;
    }
  }
  @Public() @Get('unsubscribe/:token') async unsubscribe(
    @Param('token') token: string,
  ): Promise<{ message: string; data: null }> {
    try {
      await this.service.unsubscribe(token);
      return { message: 'Hủy đăng ký thành công', data: null };
    } catch (error: unknown) {
      throw error;
    }
  }
  @Roles(UserRole.ADMIN) @Get('subscribers') async list(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<{ data: unknown }> {
    try {
      return { data: await this.service.list(page, limit) };
    } catch (error: unknown) {
      throw error;
    }
  }
}
