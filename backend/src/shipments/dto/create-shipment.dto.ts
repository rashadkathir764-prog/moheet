import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShipmentDto {
  @ApiProperty({ example: 'MOHEET Express' })
  @IsString()
  @MaxLength(120)
  carrierName: string;

  @ApiProperty({ example: 'MOH-TRK-100001' })
  @IsString()
  @MaxLength(120)
  trackingNumber: string;

  @ApiPropertyOptional({ example: 'Sanaa Fulfillment Center' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  origin?: string;

  @ApiPropertyOptional({ example: 'Aden, Yemen' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  destination?: string;

  @ApiPropertyOptional({ example: '2026-05-24T12:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  estimatedDeliveryAt?: string;
}
