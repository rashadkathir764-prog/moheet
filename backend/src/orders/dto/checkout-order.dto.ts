import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../../common/enums/payment.enum';
import { ShippingAddressDto } from './create-order.dto';

export class CheckoutOrderDto {
  @ApiPropertyOptional({ type: ShippingAddressDto })
  @ValidateIf((dto: CheckoutOrderDto) => !dto.savedAddressId)
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress?: ShippingAddressDto;

  @ApiPropertyOptional({
    example: '550c0dce-10fb-4949-a2d7-f0a06b4ece45',
    description: 'Saved customer address id. If provided, shippingAddress is optional.',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Saved address id must be a valid UUID' })
  savedAddressId?: string;

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

  @ApiPropertyOptional({ example: 'MOHEET10' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  couponCode?: string;
}
