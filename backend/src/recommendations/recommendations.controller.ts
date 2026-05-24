import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { User } from '../users/entities/user.entity';
import { RecommendationsService } from './recommendations.service';

@ApiTags('Recommendations')
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Public()
  @Get('trending')
  @ApiOperation({ summary: 'Trending products based on behavior counters' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async trending(@Query('limit') limit = 10) {
    const products = await this.recommendationsService.trending(Number(limit));
    return { success: true, data: products };
  }

  @Public()
  @Get('similar/:productId')
  @ApiOperation({ summary: 'Similar products by category, brand, tags, and behavior' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async similar(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query('limit') limit = 8,
  ) {
    const products = await this.recommendationsService.similar(productId, Number(limit));
    return { success: true, data: products };
  }

  @Get('for-me')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Personalized products for a signed-in user or guest session' })
  @ApiQuery({ name: 'sessionId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async forMe(
    @CurrentUser() user: User | null,
    @Query('sessionId') sessionId?: string,
    @Query('limit') limit = 10,
  ) {
    const products = await this.recommendationsService.forVisitor(
      user,
      sessionId,
      Number(limit),
    );
    return { success: true, data: products };
  }
}
