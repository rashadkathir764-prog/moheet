import { IsNumber, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateCouponDto {
  @ApiProperty({ example: 'MOHEET10' })
  @IsString()
  @MaxLength(40)
  code: string;

  @ApiProperty({ example: 250 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  subtotal: number;
}
