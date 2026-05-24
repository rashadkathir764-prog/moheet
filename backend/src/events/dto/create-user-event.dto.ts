import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserEventSource, UserEventType } from '../entities/user-event.entity';

export class CreateUserEventDto {
  @ApiProperty({ enum: UserEventType, example: UserEventType.PRODUCT_VIEW })
  @IsEnum(UserEventType)
  type: UserEventType;

  @ApiPropertyOptional({ example: 'web-session-uuid' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  sessionId?: string;

  @ApiPropertyOptional({ enum: UserEventSource, default: UserEventSource.WEB })
  @IsOptional()
  @IsEnum(UserEventSource)
  source?: UserEventSource;

  @ApiPropertyOptional({ example: '550c0dce-10fb-4949-a2d7-f0a06b4ece45' })
  @IsOptional()
  @Matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
  productId?: string;

  @ApiPropertyOptional({ example: '550c0dce-10fb-4949-a2d7-f0a06b4ece45' })
  @IsOptional()
  @Matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
  categoryId?: string;

  @ApiPropertyOptional({ example: '550c0dce-10fb-4949-a2d7-f0a06b4ece45' })
  @IsOptional()
  @IsUUID('4')
  orderId?: string;

  @ApiPropertyOptional({ example: 'headphones' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  searchQuery?: string;

  @ApiPropertyOptional({ example: { quantity: 1, resultCount: 12 } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
