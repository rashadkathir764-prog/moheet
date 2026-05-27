import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CheckoutOrderDto } from './dto/checkout-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { User } from '../users/entities/user.entity';

/**
 * وحدة التحكم في الطلبات
 * المسارات: /api/v1/orders/...
 *
 * صلاحيات واضحة:
 * - CUSTOMER:  POST /orders  |  GET /orders/my  |  GET /orders/:id  |  DELETE /orders/:id (إلغاء)
 * - VENDOR:    GET /orders/vendor-items
 * - ADMIN:     GET /orders  |  GET /orders/:id  |  PATCH /orders/:id/status
 */
@ApiTags('Orders')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // 🛒 POST /api/v1/orders — إنشاء طلب جديد
  // ─────────────────────────────────────────────────────────────────────────
  @Post()
  @Roles(Role.CUSTOMER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'إنشاء طلب شراء جديد مع قفل المخزون' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الطلب بنجاح' })
  @ApiResponse({ status: 400, description: 'مخزون غير كافٍ أو بيانات غير صحيحة' })
  async create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: User,
  ) {
    const order = await this.ordersService.create(dto, user);
    return {
      success: true,
      message: 'تم إنشاء طلبك بنجاح، سيتم التواصل معك قريباً',
      data: order,
    };
  }

  @Post('checkout')
  @Roles(Role.CUSTOMER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'تحويل سلة العميل الحالية إلى طلب شراء' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الطلب من السلة بنجاح' })
  @ApiResponse({ status: 400, description: 'السلة فارغة أو المخزون غير كاف' })
  async checkout(
    @Body() dto: CheckoutOrderDto,
    @CurrentUser() user: User,
  ) {
    const order = await this.ordersService.checkoutFromCart(dto, user);
    return {
      success: true,
      message: 'تم إنشاء طلبك من السلة بنجاح',
      data: order,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 📋 GET /api/v1/orders — جميع الطلبات (ADMIN فقط)
  // ─────────────────────────────────────────────────────────────────────────
  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'جلب جميع الطلبات مع فلاتر (ADMIN فقط)' })
  async findAll(@Query() query: QueryOrdersDto) {
    const result = await this.ordersService.findAll(query);
    return { success: true, ...result };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 👤 GET /api/v1/orders/my — طلبات المستخدم الحالي (CUSTOMER)
  // ─────────────────────────────────────────────────────────────────────────
  @Get('my')
  @Roles(Role.CUSTOMER, Role.VENDOR, Role.ADMIN)
  @ApiOperation({ summary: 'جلب طلبات المستخدم الحالي' })
  async findMyOrders(
    @CurrentUser() user: User,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const result = await this.ordersService.findMyOrders(user, +page, +limit);
    return { success: true, ...result };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 🏪 GET /api/v1/orders/vendor-items — عناصر طلبات البائع (VENDOR فقط)
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * البائع يرى فقط العناصر الخاصة بمنتجاته
   * لا يرى منتجات التجار الآخرين في نفس الطلب
   */
  @Get('vendor-items')
  @Roles(Role.VENDOR, Role.ADMIN)
  @ApiOperation({
    summary: 'جلب عناصر الطلبات الخاصة بمنتجات البائع (VENDOR فقط)',
  })
  async findVendorItems(
    @CurrentUser() user: User,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const result = await this.ordersService.findVendorItems(
      user,
      +page,
      +limit,
    );
    return { success: true, ...result };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 🔍 GET /api/v1/orders/:id — تفاصيل طلب واحد
  // ─────────────────────────────────────────────────────────────────────────
  @Get(':id')
  @Roles(Role.CUSTOMER, Role.ADMIN)
  @ApiOperation({
    summary: 'جلب تفاصيل طلب (CUSTOMER: طلبه فقط | ADMIN: أي طلب)',
  })
  @ApiResponse({ status: 403, description: 'محاولة الوصول لطلب شخص آخر' })
  @ApiResponse({ status: 404, description: 'الطلب غير موجود' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const order = await this.ordersService.findOne(id, user);
    return { success: true, data: order };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ✏️ PATCH /api/v1/orders/:id/status — تحديث حالة الطلب (ADMIN فقط)
  // ─────────────────────────────────────────────────────────────────────────
  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'تحديث حالة الطلب عبر State Machine (ADMIN فقط)',
  })
  @ApiResponse({ status: 422, description: 'انتقال حالة غير مسموح' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    const order = await this.ordersService.updateStatus(id, dto);
    return {
      success: true,
      message: `تم تحديث حالة الطلب إلى "${dto.status}" بنجاح`,
      data: order,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ❌ DELETE /api/v1/orders/:id — إلغاء طلب
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * CUSTOMER: يلغي طلبه فقط وفي حالة PENDING فقط
   * ADMIN:    يلغي أي طلب في أي حالة مسموحة
   */
  @Delete(':id')
  @Roles(Role.CUSTOMER, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'إلغاء طلب مع استرجاع المخزون تلقائياً',
  })
  @ApiResponse({ status: 400, description: 'لا يمكن إلغاء الطلب في هذه المرحلة' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const order = await this.ordersService.cancelOrder(id, user);
    return {
      success: true,
      message: 'تم إلغاء الطلب واسترجاع المخزون بنجاح',
      data: order,
    };
  }
}
