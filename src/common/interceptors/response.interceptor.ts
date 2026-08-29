import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../types/api-response.type';

interface MessageResult<T> {
  message?: string;
  data?: T;
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor<
  unknown,
  ApiResponse<unknown>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<ApiResponse<unknown>> {
    try {
      return next.handle().pipe(
        map((result) => {
          if (this.isMessageResult(result)) {
            return {
              success: true,
              message: result.message ?? 'Thành công',
              data: result.data ?? null,
            };
          }
          return { success: true, message: 'Thành công', data: result };
        }),
      );
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  private isMessageResult(value: unknown): value is MessageResult<unknown> {
    try {
      return (
        typeof value === 'object' &&
        value !== null &&
        ('data' in value || 'message' in value)
      );
    } catch {
      return false;
    }
  }
}
