import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { CreateUserEventDto } from './dto/create-user-event.dto';
import { EventsService } from './events.service';

@ApiTags('Events')
@SkipThrottle()
@UseGuards(OptionalJwtAuthGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Record storefront behavior for analytics and recommendations' })
  async create(@CurrentUser() user: User | null, @Body() dto: CreateUserEventDto) {
    const event = await this.eventsService.create(dto, user);

    return {
      success: true,
      data: {
        id: event.id,
        createdAt: event.createdAt,
      },
    };
  }
}
