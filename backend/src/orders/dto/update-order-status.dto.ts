import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { PaymentStatus } from '../../common/enums/payment.enum';

/**
 * DTO تحديث حالة الطلب — للـ Admin فقط
 */
export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.CONFIRMED,
    description: 'الحالة الجديدة للطلب',
  })
  @IsEnum(OrderStatus, { message: 'حالة الطلب غير صحيحة' })
  status: OrderStatus;

  @ApiPropertyOptional({
    enum: PaymentStatus,
    description: 'تحديث حالة الدفع (اختياري)',
  })
  @IsOptional()
  @IsEnum(PaymentStatus, { message: 'حالة الدفع غير صحيحة' })
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ example: 'تم التأكيد بعد التحقق من الدفع' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNotes?: string;

  @ApiPropertyOptional({
    example: 'DHL',
    description: 'اسم شركة الشحن عند نقل الطلب إلى SHIPPED',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shippingCarrier?: string;

  @ApiPropertyOptional({
    example: 'MOH-TRK-100001',
    description: 'رقم تتبع الشحنة عند نقل الطلب إلى SHIPPED',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  trackingNumber?: string;
}
