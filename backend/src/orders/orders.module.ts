import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { Cart } from '../carts/entities/cart.entity';
import { CartItem } from '../carts/entities/cart-item.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { AddressesModule } from '../addresses/addresses.module';
import { CouponsModule } from '../coupons/coupons.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      OrderStatusHistory,
      Cart,
      CartItem,
    ]),
    AddressesModule,
    CouponsModule,
    NotificationsModule,
    // ملاحظة: لا نستورد ProductsModule هنا
    // إنقاص المخزون يتم مباشرة عبر DataSource.transaction()
    // وهذا يتجنب الاعتماد الدائري المحتمل (Circular Dependency)
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
