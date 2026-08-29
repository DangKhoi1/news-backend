import { Controller, Get } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { DashboardService } from './dashboard.service';
@Controller('dashboard')
@Roles(UserRole.EDITOR, UserRole.ADMIN)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}
  @Get('summary') async summary(): Promise<{ data: unknown }> {
    try {
      return { data: await this.service.summary() };
    } catch (error: unknown) {
      throw error;
    }
  }
}
