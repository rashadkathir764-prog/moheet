import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtRefreshAuthGuard extends AuthGuard('jwt-refresh') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const refreshToken =
      request?.cookies?.refresh_token ??
      request?.headers?.cookie
        ?.split(';')
        .map((cookie: string) => cookie.trim())
        .find((cookie: string) => cookie.startsWith('refresh_token='))
        ?.substring('refresh_token='.length);

    if (!refreshToken) {
      throw new UnauthorizedException('رمز التحديث غير موجود');
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    info: { message?: string },
  ): TUser {
    if (err) throw err;
    if (!user) {
      throw new UnauthorizedException(info?.message ?? 'رمز التحديث غير صحيح');
    }

    return user;
  }
}
