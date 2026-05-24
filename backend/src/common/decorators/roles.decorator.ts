import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

export const ROLES_KEY = 'roles';

/**
 * Decorator لتحديد الأدوار المسموح لها بالوصول لمسار معين
 *
 * @example
 * // يسمح للـ ADMIN والـ VENDOR فقط
 * @Roles(Role.ADMIN, Role.VENDOR)
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Post('products')
 * createProduct() { ... }
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
