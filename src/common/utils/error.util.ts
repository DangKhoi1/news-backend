import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

const knownExceptions = [
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
];

export function rethrowServiceError(
  error: unknown,
  logger: Logger,
  context: string,
): never {
  try {
    if (
      error instanceof HttpException ||
      knownExceptions.some((Type) => error instanceof Type)
    ) {
      throw error;
    }
    const detail = error instanceof Error ? error.message : String(error);
    logger.error(
      `${context}: ${detail}`,
      error instanceof Error ? error.stack : undefined,
    );
    throw new InternalServerErrorException({
      success: false,
      message: 'Đã xảy ra lỗi hệ thống',
      data: null,
    });
  } catch (handledError: unknown) {
    if (handledError instanceof HttpException) {
      throw handledError;
    }
    throw new InternalServerErrorException({
      success: false,
      message: 'Đã xảy ra lỗi hệ thống',
      data: null,
    });
  }
}
