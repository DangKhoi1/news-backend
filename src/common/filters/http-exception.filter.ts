import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorBody {
  success?: boolean;
  message?: string | string[];
  data?: unknown;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    try {
      const context = host.switchToHttp();
      const response = context.getResponse<Response>();
      const request = context.getRequest<Request>();
      const status =
        exception instanceof HttpException
          ? exception.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;
      const raw =
        exception instanceof HttpException ? exception.getResponse() : null;
      const body: ErrorBody =
        typeof raw === 'object' && raw !== null ? raw : {};
      const message = Array.isArray(body.message)
        ? body.message.join(', ')
        : (body.message ??
          (typeof raw === 'string' ? raw : 'Đã xảy ra lỗi hệ thống'));
      this.logger.error(
        `${request.method} ${request.url} ${status}: ${message}`,
      );
      response.status(status).json({
        success: false,
        message,
        data: body.data ?? null,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    } catch (filterError: unknown) {
      this.logger.error(
        filterError instanceof Error
          ? filterError.message
          : String(filterError),
      );
    }
  }
}
