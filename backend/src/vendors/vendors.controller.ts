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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { VendorsService } from './vendors.service';
import { RegisterVendorDto } from './dto/register-vendor.dto';
import { UpdateVendorStatusDto } from './dto/update-vendor-status.dto';
import { VendorStatus } from './entities/vendor-profile.entity';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Vendors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register vendor application for admin approval' })
  async register(@Body() dto: RegisterVendorDto) {
    const profile = await this.vendorsService.register(dto);
    return {
      success: true,
      message: 'Vendor application submitted and is pending approval',
      data: profile,
    };
  }

  @ApiBearerAuth('access-token')
  @Get()
  @Roles(Role.ADMIN)
  async findAll(@Query('status') status?: VendorStatus) {
    const vendors = await this.vendorsService.findAll(status);
    return { success: true, data: vendors };
  }

  @ApiBearerAuth('access-token')
  @Get('me')
  @Roles(Role.VENDOR)
  async findMine(@CurrentUser() user: User) {
    const profile = await this.vendorsService.findMine(user);
    return { success: true, data: profile };
  }

  @ApiBearerAuth('access-token')
  @Patch(':id/status')
  @Roles(Role.ADMIN)
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVendorStatusDto,
  ) {
    const profile = await this.vendorsService.updateStatus(id, dto);
    return { success: true, message: 'Vendor status updated', data: profile };
  }
}
