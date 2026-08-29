import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user.type';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: AuthUser): Promise<{ data: unknown }> {
    try {
      return { data: await this.usersService.getProfile(user.id) };
    } catch (error: unknown) {
      throw error;
    }
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<{ message: string; data: unknown }> {
    try {
      return {
        message: 'Cập nhật hồ sơ thành công',
        data: await this.usersService.updateProfile(user.id, dto),
      };
    } catch (error: unknown) {
      throw error;
    }
  }
}
