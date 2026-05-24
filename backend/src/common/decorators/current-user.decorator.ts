import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';

/**
 * Decorator لاستخراج بيانات المستخدم الحالي من الـ Request
 *
 * @example
 * // استخراج المستخدم كاملاً
 * @Get('profile')
 * getProfile(@CurrentUser() user: User) { ... }
 *
 * // استخراج حقل محدد فقط
 * @Get('my-orders')
 * getOrders(@CurrentUser('id') userId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (field: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: User = request.user;
    return field ? user?.[field] : user;
  },
);
