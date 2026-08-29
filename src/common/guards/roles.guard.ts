import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthUser } from '../types/auth-user.type';
import { UserRole } from '../../modules/users/enums/user-role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    try {
      const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (!roles?.length) return true;
      const request = context
        .switchToHttp()
        .getRequest<Request & { user?: AuthUser }>();
      if (!request.user || !roles.includes(request.user.role))
        throw new ForbiddenException(
          'Bạn không có quyền thực hiện thao tác này',
        );
      return true;
    } catch (error: unknown) {
      if (error instanceof ForbiddenException) throw error;
      throw new ForbiddenException('Không thể kiểm tra quyền truy cập');
    }
  }
}
