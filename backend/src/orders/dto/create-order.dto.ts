import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  Max,
  Min,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../../common/enums/payment.enum';

/** DTO عنوان الشحن */
export class ShippingAddressDto {
  @ApiProperty({ example: 'أحمد محمد علي' })
  @IsString({ message: 'الاسم يجب أن يكون نصاً' })
  @IsNotEmpty({ message: 'اسم المستلم مطلوب' })
  @MaxLength(150)
  fullName: string;

  @ApiProperty({ example: '+967712345678' })
  @IsString({ message: 'رقم الهاتف يجب أن يكون نصاً' })
  @IsNotEmpty({ message: 'رقم هاتف التوصيل مطلوب' })
  @MaxLength(20)
  phone: string;

  @ApiProperty({ example: 'شارع الجمهورية، بجوار مسجد الروضة' })
  @IsString()
  @IsNotEmpty({ message: 'العنوان التفصيلي مطلوب' })
  @MaxLength(500)
  fullAddress: string;

  @ApiProperty({ example: 'صنعاء' })
  @IsString()
  @IsNotEmpty({ message: 'المدينة مطلوبة' })
  @MaxLength(100)
  city: string;

  @ApiPropertyOptional({ example: 'اليمن', default: 'اليمن' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string = 'اليمن';

  @ApiPropertyOptional({ example: 15.3694 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'خط العرض الجغرافي يجب أن يكون رقماً عشرياً' })
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 44.191 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'خط الطول الجغرافي يجب أن يكون رقماً عشرياً' })
  @Min(-180)
  @Max(180)
  longitude?: number;
}

/** DTO عنصر الطلب الواحد */
export class OrderItemDto {
  @ApiProperty({ example: '550c0dce-10fb-4949-a2d7-f0a06b4ece45' })
  @Matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, { message: 'معرف المنتج غير صحيح' })
  productId: string;

  @ApiProperty({ example: 2, description: 'الكمية المطلوبة' })
  @IsInt({ message: 'الكمية يجب أن تكون رقماً صحيحاً' })
  @IsPositive({ message: 'الكمية يجب أن تكون موجبة' })
  @Min(1, { message: 'الحد الأدنى للكمية هو 1' })
  quantity: number;
}

/**
 * DTO إنشاء طلب جديد
 */
export class CreateOrderDto {
  @ApiProperty({
    type: [OrderItemDto],
    description: 'قائمة المنتجات المطلوبة مع الكميات',
    example: [{ productId: 'uuid-here', quantity: 2 }],
  })
  @IsArray({ message: 'قائمة المنتجات يجب أن تكون مصفوفة' })
  @IsNotEmpty({ message: 'قائمة المنتجات لا يمكن أن تكون فارغة' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ type: ShippingAddressDto })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    default: PaymentMethod.CASH_ON_DELIVERY,
  })
  @IsOptional()
  @IsEnum(PaymentMethod, { message: 'طريقة الدفع غير صحيحة' })
  paymentMethod?: PaymentMethod = PaymentMethod.CASH_ON_DELIVERY;

  @ApiPropertyOptional({ example: 'يرجى التسليم في الصباح' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
