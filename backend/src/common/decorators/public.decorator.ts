import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator لتعليم المسارات العامة التي لا تحتاج مصادقة
 *
 * @example
 * @Public()
 * @Post('auth/login')
 * login() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
