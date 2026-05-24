import { IsInt, IsPositive, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCartItemDto {
  @ApiProperty({ example: 2, description: 'الكمية الجديدة للعنصر داخل السلة' })
  @IsInt({ message: 'الكمية يجب أن تكون رقماً صحيحاً' })
  @IsPositive({ message: 'الكمية يجب أن تكون موجبة' })
  @Min(1, { message: 'الحد الأدنى للكمية هو 1' })
  quantity: number;
}
