import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ example: '550c0dce-10fb-4949-a2d7-f0a06b4ece45' })
  @Matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
  productId: string;

  @ApiProperty({ example: '550c0dce-10fb-4949-a2d7-f0a06b4ece45' })
  @IsUUID('4')
  orderId: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Excellent quality' })
  @IsOptional()
  @IsString()
  @MaxLength(140)
  title?: string;

  @ApiPropertyOptional({ example: 'The product arrived on time and matched the description.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
