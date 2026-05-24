import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import * as bcrypt from 'bcrypt';

function extractRefreshToken(request: Request): string | null {
  const parsedCookie = request?.cookies?.refresh_token;
  if (parsedCookie) return parsedCookie;

  const cookieHeader = request?.headers?.cookie;
  if (!cookieHeader) return null;

  const refreshCookie = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith('refresh_token='));

  if (!refreshCookie) return null;

  return decodeURIComponent(refreshCookie.substring('refresh_token='.length));
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
  true,
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extractRefreshToken]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(
    request: Request,
    payload: { sub: string; email: string },
  ) {
    const user = await this.usersService.findById(payload.sub);

    if (!user || !user.refreshToken || !user.isActive) {
      throw new UnauthorizedException('جلسة العمل منتهية، يرجى تسجيل الدخول');
    }

    const refreshToken = extractRefreshToken(request);
    if (!refreshToken) {
      throw new UnauthorizedException('رمز التحديث غير موجود');
    }

    const tokenMatches = await bcrypt.compare(refreshToken, user.refreshToken);

    if (!tokenMatches) {
      throw new UnauthorizedException('رمز التحديث غير صحيح');
    }

    return user;
  }
}
