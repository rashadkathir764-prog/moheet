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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ShipmentsService } from './shipments.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Shipments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('shipments')
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Post('orders/:orderId')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'إنشاء شحنة مستقلة لطلب جاهز للشحن' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الشحنة بنجاح' })
  async createForOrder(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: CreateShipmentDto,
  ) {
    const shipment = await this.shipmentsService.createForOrder(orderId, dto);
    return {
      success: true,
      message: 'تم إنشاء الشحنة وربطها بالطلب',
      data: shipment,
    };
  }

  @Get('my')
  @Roles(Role.CUSTOMER, Role.ADMIN)
  @ApiOperation({ summary: 'عرض شحنات المستخدم الحالي' })
  async findMyShipments(@CurrentUser() user: User) {
    const shipments = await this.shipmentsService.findMyShipments(user);
    return { success: true, data: shipments };
  }

  @Get('orders/:orderId')
  @Roles(Role.CUSTOMER, Role.ADMIN)
  @ApiOperation({ summary: 'عرض شحنة طلب محدد مع التحقق من الملكية' })
  async findByOrder(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: User,
  ) {
    const shipment = await this.shipmentsService.findByOrder(orderId, user);
    return { success: true, data: shipment };
  }

  @Get(':id')
  @Roles(Role.CUSTOMER, Role.ADMIN)
  @ApiOperation({ summary: 'عرض شحنة محددة مع سجل التتبع' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const shipment = await this.shipmentsService.findOne(id, user);
    return { success: true, data: shipment };
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'تحديث حالة الشحنة وإضافة حدث تتبع' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShipmentStatusDto,
  ) {
    const shipment = await this.shipmentsService.updateStatus(id, dto);
    return {
      success: true,
      message: `تم تحديث حالة الشحنة إلى ${dto.status}`,
      data: shipment,
    };
  }
}
