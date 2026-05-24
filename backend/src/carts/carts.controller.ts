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
import { CartsService } from './carts.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Cart')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
@Controller('cart')
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Get()
  @ApiOperation({ summary: 'جلب سلة المستخدم الحالي' })
  async getMyCart(@CurrentUser() user: User) {
    const cart = await this.cartsService.getMyCart(user);
    return { success: true, data: cart };
  }

  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'إضافة منتج إلى سلة المستخدم الحالي' })
  @ApiResponse({ status: 400, description: 'الكمية المطلوبة تتجاوز المخزون' })
  async addItem(@CurrentUser() user: User, @Body() dto: AddCartItemDto) {
    const cart = await this.cartsService.addItem(user, dto);
    return {
      success: true,
      message: 'تمت إضافة المنتج إلى السلة بنجاح',
      data: cart,
    };
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'تحديث كمية عنصر داخل سلة المستخدم الحالي' })
  @ApiResponse({ status: 404, description: 'عنصر السلة غير موجود' })
  async updateQuantity(
    @CurrentUser() user: User,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const cart = await this.cartsService.updateQuantity(user, itemId, dto);
    return {
      success: true,
      message: 'تم تحديث كمية المنتج في السلة بنجاح',
      data: cart,
    };
  }

  @Delete('items/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'حذف عنصر من سلة المستخدم الحالي' })
  async removeItem(
    @CurrentUser() user: User,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    const cart = await this.cartsService.removeItem(user, itemId);
    return {
      success: true,
      message: 'تم حذف المنتج من السلة بنجاح',
      data: cart,
    };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تفريغ سلة المستخدم الحالي' })
  async clearCart(@CurrentUser() user: User) {
    const cart = await this.cartsService.clearCart(user);
    return {
      success: true,
      message: 'تم تفريغ السلة بنجاح',
      data: cart,
    };
  }
}
