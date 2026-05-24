import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiPropertyOptional({ example: 'Home', default: 'Home' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  label?: string = 'Home';

  @ApiProperty({ example: 'MOHEET Customer' })
  @IsString()
  @MaxLength(150)
  recipientName: string;

  @ApiProperty({ example: '+967700000000' })
  @IsString()
  @MaxLength(20)
  phone: string;

  @ApiProperty({ example: 'Sanaa' })
  @IsString()
  @MaxLength(100)
  city: string;

  @ApiPropertyOptional({ example: 'Al Sabeen' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  district?: string;

  @ApiPropertyOptional({ example: 'Main Street' })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  street?: string;

  @ApiProperty({ example: 'Sanaa, Al Sabeen, Main Street, near landmark' })
  @IsString()
  @MaxLength(500)
  fullAddress: string;

  @ApiPropertyOptional({ example: 'Yemen', default: 'Yemen' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string = 'Yemen';

  @ApiPropertyOptional({ example: '00000' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  postalCode?: string;

  @ApiPropertyOptional({ example: 15.3694 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 44.191 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean = false;
}
