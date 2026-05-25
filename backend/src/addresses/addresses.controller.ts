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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Addresses')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a saved customer address' })
  @ApiResponse({ status: 201, description: 'Address created successfully' })
  async create(@CurrentUser() user: User, @Body() dto: CreateAddressDto) {
    const address = await this.addressesService.create(user, dto);
    return {
      success: true,
      message: 'Address created successfully',
      data: address,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List addresses for the current customer' })
  async findMine(@CurrentUser() user: User) {
    const addresses = await this.addressesService.findMine(user);
    return { success: true, data: addresses };
  }

  @Get('default')
  @ApiOperation({ summary: 'Get default address for the current customer' })
  async findDefault(@CurrentUser() user: User) {
    const address = await this.addressesService.findDefault(user);
    return { success: true, data: address };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a saved address owned by the current customer' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async findOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const address = await this.addressesService.findOne(id, user);
    return { success: true, data: address };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a saved address owned by the current customer' })
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    const address = await this.addressesService.update(id, user, dto);
    return {
      success: true,
      message: 'Address updated successfully',
      data: address,
    };
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Set a saved address as the default address' })
  async setDefault(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const address = await this.addressesService.setDefault(id, user);
    return {
      success: true,
      message: 'Default address updated successfully',
      data: address,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a saved address owned by the current customer' })
  async remove(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.addressesService.remove(id, user);
    return {
      success: true,
      message: 'Address deleted successfully',
    };
  }
}
