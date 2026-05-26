import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { User } from '../users/entities/user.entity';
import { CreateUserEventDto } from './dto/create-user-event.dto';
import { EventsService } from './events.service';

@ApiTags('Events')
@SkipThrottle()
@UseGuards(OptionalJwtAuthGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get('analytics/summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Admin analytics summary from behavior events' })
  async analyticsSummary(@Query('range') range?: string) {
    const summary = await this.eventsService.getAdminAnalyticsSummary(range);
    return { success: true, data: summary };
  }

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
