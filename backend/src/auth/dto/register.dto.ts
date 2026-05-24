import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEmpty,
  Matches,
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
    example: 'StrongPass@123',
    description: 'Password with at least 8 characters, one number, and one special character',
  })
  @IsString()
  @MinLength(8, { message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' })
  @MaxLength(64, { message: 'كلمة المرور طويلة جداً' })
  @Matches(/^(?=.*[0-9])(?=.*[!@#$%^&*])/, {
    message: 'كلمة المرور يجب أن تحتوي على رقم وحرف خاص واحد على الأقل',
  })
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
