import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterVendorDto {
  @ApiProperty({ example: 'vendor@moheet.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPass@123' })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[0-9])(?=.*[!@#$%^&*])/, {
    message: 'Password must contain at least one number and one special character',
  })
  password: string;

  @ApiProperty({ example: 'Vendor Owner' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  fullName: string;

  @ApiPropertyOptional({ example: '+967700000000' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiProperty({ example: 'MOHEET Electronics' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  storeName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: 'sales@vendor.com' })
  @IsOptional()
  @IsEmail()
  businessEmail?: string;

  @ApiPropertyOptional({ example: '+967711111111' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  businessPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  businessAddress?: string;
}
