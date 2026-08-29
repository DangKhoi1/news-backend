import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { rethrowServiceError } from '../../common/utils/error.util';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User } from './entities/user.entity';

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  createdAt: Date;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    try {
      return await this.users.findOne({ where: { id, isActive: true } });
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'findById');
    }
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    try {
      return await this.users
        .createQueryBuilder('user')
        .addSelect('user.passwordHash')
        .where('LOWER(user.email) = LOWER(:email)', { email })
        .getOne();
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'findByEmailWithPassword');
    }
  }

  async getProfile(id: string): Promise<PublicUser> {
    try {
      const user = await this.findById(id);
      if (!user) throw new NotFoundException('Không tìm thấy người dùng');
      return this.toPublicUser(user);
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'getProfile');
    }
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<PublicUser> {
    try {
      const user = await this.findById(id);
      if (!user) throw new NotFoundException('Không tìm thấy người dùng');
      if (dto.displayName !== undefined)
        user.displayName = dto.displayName.trim();
      if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;
      return this.toPublicUser(await this.users.save(user));
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'updateProfile');
    }
  }

  async createUser(
    input: Pick<User, 'email' | 'passwordHash' | 'displayName' | 'role'>,
  ): Promise<User> {
    try {
      return await this.users.save(this.users.create(input));
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'createUser');
    }
  }

  async updateLastLogin(id: string): Promise<void> {
    try {
      await this.users.update({ id }, { lastLoginAt: new Date() });
    } catch (error: unknown) {
      rethrowServiceError(error, this.logger, 'updateLastLogin');
    }
  }

  toPublicUser(user: User): PublicUser {
    try {
      return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        createdAt: user.createdAt,
      };
    } catch (error: unknown) {
      return rethrowServiceError(error, this.logger, 'toPublicUser');
    }
  }
}
