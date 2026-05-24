import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

/**
 * استراتيجية التحقق من الـ Access Token
 * تستخرجه من رأس Authorization: Bearer <token>
 * وتتحقق من صحته ثم تُرفق بيانات المستخدم في الـ request
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  /**
   * يُستدعى تلقائياً بعد التحقق من التوقيع
   * يتحقق من أن المستخدم ما زال نشطاً في قاعدة البيانات
   */
  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.usersService.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('الحساب غير نشط أو غير موجود');
    }

    return user; // يُرفَق في request.user
  }
}
