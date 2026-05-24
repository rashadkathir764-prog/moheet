import {
  Body,
  Controller,
  Delete,
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
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Coupons')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCouponDto) {
    const coupon = await this.couponsService.create(dto);
    return { success: true, message: 'Coupon created', data: coupon };
  }

  @Get()
  @Roles(Role.ADMIN)
  async findAll() {
    const coupons = await this.couponsService.findAll();
    return { success: true, data: coupons };
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCouponDto,
  ) {
    const coupon = await this.couponsService.update(id, dto);
    return { success: true, message: 'Coupon updated', data: coupon };
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.couponsService.remove(id);
    return { success: true, message: 'Coupon deleted' };
  }

  @Post('validate')
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Validate coupon for current customer subtotal' })
  async validate(@CurrentUser() user: User, @Body() dto: ValidateCouponDto) {
    const result = await this.couponsService.validate(user, dto);
    return { success: true, data: result };
  }
}
