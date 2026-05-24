import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '../../common/enums/payment.enum';

export class SimulatePaymentDto {
  @ApiProperty({
    enum: [PaymentStatus.PAID, PaymentStatus.FAILED],
    example: PaymentStatus.PAID,
  })
  @IsEnum(PaymentStatus, { message: 'حالة الدفع غير صحيحة' })
  status: PaymentStatus.PAID | PaymentStatus.FAILED;

  @ApiPropertyOptional({ example: 'sim_20260520_0001' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  providerReference?: string;

  @ApiPropertyOptional({ example: 'Card declined by simulator' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  failureReason?: string;
}
