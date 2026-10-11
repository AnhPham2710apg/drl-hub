import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản sinh viên / cán bộ Đoàn Hội' })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công và cấp JWT tokens' })
  async register(
    @Body()
    body: {
      email: string;
      password?: string;
      fullName: string;
      studentId?: string;
      faculty?: string;
      role?: string;
    },
  ) {
    if (!body.email || !body.fullName) {
      throw new BadRequestException('Email và Họ tên là bắt buộc');
    }
    return this.authService.register(body);
  }

  @Post('login')
  @ApiOperation({ summary: 'Đăng nhập hệ thống DRL-Hub' })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công' })
  async login(
    @Body()
    body: {
      email: string;
      password?: string;
    },
  ) {
    if (!body.email) {
      throw new BadRequestException('Email là bắt buộc');
    }
    return this.authService.login(body.email, body.password);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin tài khoản hiện tại' })
  getProfile(@Request() req: any) {
    return req.user;
  }
}
