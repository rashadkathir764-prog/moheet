import { IsInt, IsPositive, Matches, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddCartItemDto {
  @ApiProperty({ example: '550c0dce-10fb-4949-a2d7-f0a06b4ece45' })
  @Matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, { message: 'معرف المنتج غير صحيح' })
  productId: string;

  @ApiProperty({ example: 1, description: 'الكمية المطلوب إضافتها للسلة' })
  @IsInt({ message: 'الكمية يجب أن تكون رقماً صحيحاً' })
  @IsPositive({ message: 'الكمية يجب أن تكون موجبة' })
  @Min(1, { message: 'الحد الأدنى للكمية هو 1' })
  quantity: number;
}
