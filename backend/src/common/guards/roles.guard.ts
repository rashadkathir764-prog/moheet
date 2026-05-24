import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard للتحقق من صلاحيات الأدوار (RBAC)
 * يُستخدَم بعد JwtAuthGuard دائماً (يفترض وجود user في الـ request)
 *
 * @example
 * @Roles(Role.ADMIN)
 * @UseGuards(JwtAuthGuard, RolesGuard)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // إذا لم تُحدَّد أدوار — المسار مسموح لجميع المستخدمين المصادَق عليهم
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('غير مصرح لك بالوصول لهذا المورد');
    }

    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      throw new ForbiddenException(
        `هذا المورد متاح فقط لـ: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
