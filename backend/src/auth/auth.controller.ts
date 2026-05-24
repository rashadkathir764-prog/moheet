import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JwtRefreshAuthGuard } from '../common/guards/jwt-refresh-auth.guard';
import { User } from '../users/entities/user.entity';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'تسجيل مستخدم جديد' })
  @ApiResponse({ status: 201, description: 'تم التسجيل بنجاح' })
  @ApiResponse({ status: 409, description: 'البريد الإلكتروني مستخدم مسبقاً' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { user, tokens } = await this.authService.register(dto);

    this.setRefreshTokenCookie(response, tokens.refreshToken);

    return {
      success: true,
      message: 'تم إنشاء الحساب بنجاح',
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
        accessToken: tokens.accessToken,
      },
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تسجيل الدخول' })
  @ApiResponse({ status: 200, description: 'تم تسجيل الدخول بنجاح' })
  @ApiResponse({ status: 401, description: 'بيانات الدخول غير صحيحة' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { user, tokens } = await this.authService.login(dto);

    this.setRefreshTokenCookie(response, tokens.refreshToken);

    return {
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          isVerified: user.isVerified,
        },
        accessToken: tokens.accessToken,
      },
    };
  }

  @Public()
  @UseGuards(JwtRefreshAuthGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تجديد Access Token عبر Refresh Token' })
  async refresh(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) response: Response,
  ) {
    const tokens = await this.authService.refreshTokens(user);

    this.setRefreshTokenCookie(response, tokens.refreshToken);

    return {
      success: true,
      message: 'تم تجديد الجلسة بنجاح',
      data: {
        accessToken: tokens.accessToken,
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'تسجيل الخروج وإلغاء الجلسة' })
  async logout(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(userId);
    response.clearCookie('refresh_token', this.getRefreshTokenCookieOptions());

    return {
      success: true,
      message: 'تم تسجيل الخروج بنجاح',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'جلب بيانات المستخدم الحالي' })
  getMe(@CurrentUser() user: User) {
    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    };
  }

  private setRefreshTokenCookie(response: Response, token: string): void {
    response.cookie('refresh_token', token, {
      ...this.getRefreshTokenCookieOptions(),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private getRefreshTokenCookieOptions(): CookieOptions {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/api/v1/auth/refresh',
    };
  }
}
