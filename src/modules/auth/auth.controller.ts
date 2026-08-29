import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthUser } from '../../common/types/auth-user.type';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}
  @Public() @Post('register') async register(
    @Body() dto: RegisterDto,
  ): Promise<{ message: string; data: unknown }> {
    try {
      return {
        message: 'Đăng ký thành công',
        data: await this.authService.register(dto),
      };
    } catch (error: unknown) {
      throw error;
    }
  }
  @Public() @Post('login') async login(
    @Body() dto: LoginDto,
  ): Promise<{ message: string; data: unknown }> {
    try {
      return {
        message: 'Đăng nhập thành công',
        data: await this.authService.login(dto),
      };
    } catch (error: unknown) {
      throw error;
    }
  }
  @Public() @Post('refresh') async refresh(
    @Body() dto: RefreshTokenDto,
  ): Promise<{ message: string; data: unknown }> {
    try {
      return {
        message: 'Làm mới token thành công',
        data: await this.authService.refresh(dto.refreshToken),
      };
    } catch (error: unknown) {
      throw error;
    }
  }
  @Post('logout') async logout(
    @Body() dto: RefreshTokenDto,
  ): Promise<{ message: string; data: null }> {
    try {
      await this.authService.logout(dto.refreshToken);
      return { message: 'Đăng xuất thành công', data: null };
    } catch (error: unknown) {
      throw error;
    }
  }
  @Get('me') async me(
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: unknown }> {
    try {
      return { data: await this.usersService.getProfile(user.id) };
    } catch (error: unknown) {
      throw error;
    }
  }
}
