import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsPositive,
  Min,
  MaxLength,
  MinLength,
  IsArray,
  ValidateNested,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** DTO فرعي لصور المنتج */
class ProductImageDto {
  @ApiProperty({ example: 'https://cdn.moheet.com/products/img.webp' })
  @IsUrl({}, { message: 'رابط الصورة غير صحيح' })
  imageUrl: string;

  @ApiPropertyOptional({ example: 'صورة أمامية للمنتج' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}

/**
 * DTO إنشاء منتج جديد
 * يُستخدَم من VENDOR و ADMIN فقط
 */
export class CreateProductDto {
  @ApiProperty({ example: 'سماعات لاسلكية فاخرة Pro Max' })
  @IsString({ message: 'اسم المنتج يجب أن يكون نصاً' })
  @MinLength(3, { message: 'اسم المنتج يجب أن يكون 3 أحرف على الأقل' })
  @MaxLength(255, { message: 'اسم المنتج طويل جداً' })
  name: string;

  @ApiPropertyOptional({
    example: 'سماعات لاسلكية بتقنية نويز كانسلينج متطورة...',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '550c0dce-10fb-4949-a2d7-f0a06b4ece45' })
  @IsUUID('4', { message: 'معرف التصنيف غير صحيح' })
  categoryId: string;

  @ApiProperty({ example: 299.99, description: 'السعر الحالي' })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'السعر يجب أن يكون رقماً' })
  @IsPositive({ message: 'السعر يجب أن يكون موجباً' })
  price: number;

  @ApiPropertyOptional({ example: 399.99, description: 'السعر قبل الخصم' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  comparePrice?: number;

  @ApiPropertyOptional({ example: 'SKU-AUDIO-001' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @ApiPropertyOptional({ example: 'Sony' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string;

  @ApiPropertyOptional({ example: ['wireless', 'audio'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];

  @ApiProperty({ example: 50, description: 'الكمية المتاحة في المخزون' })
  @IsNumber()
  @Min(0, { message: 'المخزون لا يمكن أن يكون سالباً' })
  stockQuantity: number;

  @ApiPropertyOptional({ example: 0.35, description: 'الوزن بالكيلوغرام' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  weightKg?: number;

  @ApiPropertyOptional({ example: 'https://cdn.moheet.com/thumb.webp' })
  @IsOptional()
  @IsUrl({}, { message: 'رابط الصورة المصغرة غير صحيح' })
  thumbnailUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    type: [ProductImageDto],
    description: 'مصفوفة صور إضافية للمنتج',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images?: ProductImageDto[];
}
