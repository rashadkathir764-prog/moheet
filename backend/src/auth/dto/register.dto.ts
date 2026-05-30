import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEmpty,
} from 'class-validator';
import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'ahmed@moheet.com',
    description: 'User email address used for login',
  })
  @IsEmail({}, { message: 'البريد الإلكتروني غير صحيح' })
  email: string;

  @ApiProperty({
    example: 'أحمد محمد',
    description: 'Full name',
  })
  @IsString({ message: 'الاسم يجب أن يكون نصاً' })
  @MinLength(2, { message: 'الاسم يجب أن يكون حرفين على الأقل' })
  @MaxLength(150, { message: 'الاسم طويل جداً' })
  fullName: string;

  @ApiProperty({
    example: 'rashad',
    description: 'Password with at least 6 characters',
  })
  @IsString()
  @MinLength(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
  @MaxLength(64, { message: 'كلمة المرور طويلة جداً' })
  password: string;

  @ApiPropertyOptional({
    example: '+967712345678',
    description: 'Optional phone number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiHideProperty()
  @IsEmpty({ message: 'لا يمكن تحديد الدور أثناء التسجيل العام' })
  role?: never;
}
