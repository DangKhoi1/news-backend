import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { RefreshJwtPayload } from '../../common/types/auth-user.type';
import { rethrowServiceError } from '../../common/utils/error.util';
import { UserRole } from '../users/enums/user-role.enum';
import { PublicUser, UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshToken } from './entities/refresh-token.entity';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}
interface AuthResult extends TokenPair {
  user: PublicUser;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly usersService: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    try {
      if (await this.usersService.findByEmailWithPassword(dto.email))
        throw new ConflictException('Email đã được sử dụng');
      const user = await this.usersService.createUser({
        email: dto.email,
        displayName: dto.displayName.trim(),
        passwordHash: await bcrypt.hash(dto.password, 12),
        role: UserRole.READER,
      });
      return {
        user: this.usersService.toPublicUser(user),
        ...(await this.createTokenPair(user.id, user.email, user.role)),
      };
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'register');
    }
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    try {
      const user = await this.usersService.findByEmailWithPassword(dto.email);
      if (
        !user ||
        !user.isActive ||
        !(await bcrypt.compare(dto.password, user.passwordHash))
      )
        throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
      await this.usersService.updateLastLogin(user.id);
      return {
        user: this.usersService.toPublicUser(user),
        ...(await this.createTokenPair(user.id, user.email, user.role)),
      };
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'login');
    }
  }

  async refresh(rawToken: string): Promise<TokenPair> {
    try {
      const payload = await this.jwt.verifyAsync<RefreshJwtPayload>(rawToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
      if (payload.tokenType !== 'refresh')
        throw new UnauthorizedException('Refresh token không hợp lệ');
      const stored = await this.refreshTokens.findOne({
        where: { id: payload.tokenId, tokenHash: this.hashToken(rawToken) },
        relations: { user: true },
      });
      if (
        !stored ||
        stored.revokedAt ||
        stored.expiresAt <= new Date() ||
        !stored.user.isActive
      )
        throw new UnauthorizedException(
          'Refresh token đã hết hạn hoặc bị thu hồi',
        );
      stored.revokedAt = new Date();
      await this.refreshTokens.save(stored);
      return await this.createTokenPair(
        stored.user.id,
        stored.user.email,
        stored.user.role,
      );
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }
  }

  async logout(rawToken: string): Promise<void> {
    try {
      await this.refreshTokens.update(
        { tokenHash: this.hashToken(rawToken), revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
    } catch (error: unknown) {
      rethrowServiceError(error, this.logger, 'logout');
    }
  }

  private async createTokenPair(
    userId: string,
    email: string,
    role: UserRole,
  ): Promise<TokenPair> {
    try {
      const tokenId = randomUUID();
      const accessExpires = this.config.get<string>(
        'JWT_ACCESS_EXPIRES_IN',
        '15m',
      ) as JwtSignOptions['expiresIn'];
      const refreshExpires = this.config.get<string>(
        'JWT_REFRESH_EXPIRES_IN',
        '30d',
      ) as JwtSignOptions['expiresIn'];
      const accessToken = await this.jwt.signAsync(
        { sub: userId, id: userId, email, role, tokenType: 'access' },
        {
          secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
          expiresIn: accessExpires,
        },
      );
      const refreshToken = await this.jwt.signAsync(
        { sub: userId, email, tokenType: 'refresh', tokenId },
        {
          secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
          expiresIn: refreshExpires,
        },
      );
      const decoded = this.jwt.decode<{ exp?: number }>(refreshToken);
      await this.refreshTokens.save(
        this.refreshTokens.create({
          id: tokenId,
          userId,
          tokenHash: this.hashToken(refreshToken),
          expiresAt: new Date((decoded.exp ?? 0) * 1000),
          revokedAt: null,
        }),
      );
      return { accessToken, refreshToken, expiresIn: String(accessExpires) };
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'createTokenPair');
    }
  }

  private hashToken(token: string): string {
    try {
      return createHash('sha256').update(token).digest('hex');
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'hashToken');
    }
  }
}
