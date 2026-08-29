import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
interface HealthResult {
  status: 'ok';
  service: string;
  timestamp: string;
  uptimeSeconds: number;
}
@Controller('health')
export class HealthController {
  @Public() @Get() check(): { data: HealthResult } {
    try {
      return {
        data: {
          status: 'ok',
          service: 'nhip-tin-backend',
          timestamp: new Date().toISOString(),
          uptimeSeconds: Math.floor(process.uptime()),
        },
      };
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  }
}
