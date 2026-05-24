import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

/**
 * DTO تحديث المنتج — جميع حقول CreateProductDto اختيارية
 * يستخدم PartialType من @nestjs/swagger للحفاظ على Swagger docs
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {}
