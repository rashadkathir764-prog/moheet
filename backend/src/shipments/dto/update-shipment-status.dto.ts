import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShipmentStatus } from '../../common/enums/shipment-status.enum';

export class UpdateShipmentStatusDto {
  @ApiProperty({ enum: ShipmentStatus, example: ShipmentStatus.IN_TRANSIT })
  @IsEnum(ShipmentStatus, { message: 'حالة الشحنة غير صحيحة' })
  status: ShipmentStatus;

  @ApiPropertyOptional({ example: 'Sanaa Sorting Hub' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  location?: string;

  @ApiPropertyOptional({ example: 'Package arrived at sorting hub' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @ApiPropertyOptional({ example: '2026-05-20T18:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}
