import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../../common/enums/payment.enum';

export class InitiatePaymentDto {
  @ApiPropertyOptional({
    enum: PaymentMethod,
    description: 'Payment method override. Defaults to the order payment method.',
  })
  @IsOptional()
  @IsEnum(PaymentMethod, { message: 'طريقة الدفع غير صحيحة' })
  method?: PaymentMethod;

  @ApiPropertyOptional({ example: 'YER', default: 'YER' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string = 'YER';
}
