import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RefundPaymentDto {
  @ApiPropertyOptional({ example: 'Customer return accepted' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
