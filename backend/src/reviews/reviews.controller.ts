import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewStatusDto } from './dto/update-review-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get('products/:productId')
  @ApiOperation({ summary: 'List approved reviews for a product' })
  async findByProduct(@Param('productId', ParseUUIDPipe) productId: string) {
    const reviews = await this.reviewsService.findByProduct(productId);
    return { success: true, data: reviews };
  }

  @ApiBearerAuth('access-token')
  @Post()
  @Roles(Role.CUSTOMER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create verified-purchase review after delivery' })
  async create(@CurrentUser() user: User, @Body() dto: CreateReviewDto) {
    const review = await this.reviewsService.create(user, dto);
    return { success: true, message: 'Review created successfully', data: review };
  }

  @ApiBearerAuth('access-token')
  @Get('my')
  @Roles(Role.CUSTOMER)
  async findMine(@CurrentUser() user: User) {
    const reviews = await this.reviewsService.findMine(user);
    return { success: true, data: reviews };
  }

  @ApiBearerAuth('access-token')
  @Get()
  @Roles(Role.ADMIN)
  async findAll() {
    const reviews = await this.reviewsService.findAll();
    return { success: true, data: reviews };
  }

  @ApiBearerAuth('access-token')
  @Patch(':id/status')
  @Roles(Role.ADMIN)
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReviewStatusDto,
  ) {
    const review = await this.reviewsService.updateStatus(id, dto);
    return { success: true, message: 'Review status updated', data: review };
  }
}
