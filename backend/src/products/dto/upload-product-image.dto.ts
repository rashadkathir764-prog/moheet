import { IsBooleanString, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UploadProductImageDto {
  @ApiPropertyOptional({ example: 'صورة أمامية للمنتج' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    example: 'true',
    description: 'تعيين الصورة كصورة رئيسية للمنتج',
  })
  @IsOptional()
  @IsBooleanString()
  makeMain?: string;
}
