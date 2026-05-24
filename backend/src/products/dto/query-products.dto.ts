import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  IsEnum,
  Matches,
  Min,
  Max,
  IsInt,
  IsPositive,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum ProductSortBy {
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  NEWEST = 'newest',
  OLDEST = 'oldest',
  NAME_AZ = 'name_az',
}

/**
 * DTO استعلام المنتجات — يدعم:
 * - البحث النصي (q) — Full-Text Search عربي
 * - التصفية (categoryId, vendorId, isFeatured, isActive)
 * - نطاق السعر (minPrice, maxPrice)
 * - الترتيب (sortBy)
 * - التصفح بالصفحات (page, limit)
 */
export class QueryProductsDto {
  @ApiPropertyOptional({ example: 'سماعات لاسلكية', description: 'نص البحث' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'معرف التصنيف للتصفية' })
  @IsOptional()
  @Matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, { message: 'معرف التصنيف غير صحيح' })
  categoryId?: string;

  @ApiPropertyOptional({ description: 'معرف البائع للتصفية' })
  @IsOptional()
  @IsString()
  vendorId?: string;

  @ApiPropertyOptional({ example: 'Sony', description: 'العلامة التجارية' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ example: 'audio', description: 'وسم منتج واحد للتصفية' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: 'المنتجات المميزة فقط' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'تضمين المنتجات غير النشطة (Admin فقط)', default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeInactive?: boolean;

  @ApiPropertyOptional({ example: 100, description: 'الحد الأدنى للسعر' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ example: 1000, description: 'الحد الأقصى للسعر' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  maxPrice?: number;

  @ApiPropertyOptional({ enum: ProductSortBy, default: ProductSortBy.NEWEST })
  @IsOptional()
  @IsEnum(ProductSortBy)
  sortBy?: ProductSortBy = ProductSortBy.NEWEST;

  @ApiPropertyOptional({ example: 1, description: 'رقم الصفحة', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'عدد العناصر لكل صفحة', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
