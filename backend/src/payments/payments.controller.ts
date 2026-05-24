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
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { SimulatePaymentDto } from './dto/simulate-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Payments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('orders/:orderId/initiate')
  @Roles(Role.CUSTOMER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'بدء عملية دفع لطلب يملكه العميل الحالي' })
  @ApiResponse({ status: 201, description: 'تم إنشاء عملية دفع معلقة' })
  async initiateForOrder(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: InitiatePaymentDto,
    @CurrentUser() user: User,
  ) {
    const payment = await this.paymentsService.initiateForOrder(
      orderId,
      dto,
      user,
    );

    return {
      success: true,
      message: 'تم بدء عملية الدفع',
      data: payment,
    };
  }

  @Get('my')
  @Roles(Role.CUSTOMER, Role.ADMIN)
  @ApiOperation({ summary: 'عرض مدفوعات المستخدم الحالي' })
  async findMyPayments(@CurrentUser() user: User) {
    const payments = await this.paymentsService.findMyPayments(user);
    return { success: true, data: payments };
  }

  @Get('orders/:orderId')
  @Roles(Role.CUSTOMER, Role.ADMIN)
  @ApiOperation({ summary: 'عرض مدفوعات طلب محدد مع التحقق من الملكية' })
  async findOrderPayments(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: User,
  ) {
    const payments = await this.paymentsService.findOrderPayments(
      orderId,
      user,
    );
    return { success: true, data: payments };
  }

  @Patch(':paymentId/simulate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'محاكاة نجاح أو فشل الدفع في بيئة التطوير' })
  async simulate(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body() dto: SimulatePaymentDto,
  ) {
    const payment = await this.paymentsService.simulate(paymentId, dto);
    return {
      success: true,
      message: `تم تحديث عملية الدفع إلى ${dto.status}`,
      data: payment,
    };
  }

  @Patch(':paymentId/refund')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'استرجاع عملية دفع ناجحة' })
  async refund(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body() dto: RefundPaymentDto,
  ) {
    const payment = await this.paymentsService.refund(paymentId, dto);
    return {
      success: true,
      message: 'تم استرجاع عملية الدفع',
      data: payment,
    };
  }
}
