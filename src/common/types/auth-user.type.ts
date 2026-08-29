import { UserRole } from '../../modules/users/enums/user-role.enum';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface JwtPayload extends AuthUser {
  sub: string;
  tokenType: 'access';
}

export interface RefreshJwtPayload {
  sub: string;
  email: string;
  tokenType: 'refresh';
  tokenId: string;
}
