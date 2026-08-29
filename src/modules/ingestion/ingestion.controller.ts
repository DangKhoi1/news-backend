import { Controller, Get, Post } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { IngestionService } from './ingestion.service';

@Controller('ingestion')
@Roles(UserRole.ADMIN)
export class IngestionController {
  constructor(private readonly service: IngestionService) {}

  @Post('sync')
  async sync(): Promise<{ message: string; data: unknown }> {
    try {
      return {
        message: 'Đồng bộ tin tức hoàn tất',
        data: await this.service.syncAll('manual'),
      };
    } catch (error: unknown) {
      throw error;
    }
  }

  @Get('status')
  async status(): Promise<{ data: unknown }> {
    try {
      return { data: await this.service.getStatus() };
    } catch (error: unknown) {
      throw error;
    }
  }
}
