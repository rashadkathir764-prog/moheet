import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';
import { Product } from '../products/entities/product.entity';
import { ProductImage } from '../products/entities/product-image.entity';
import { Cart } from '../carts/entities/cart.entity';
import { CartItem } from '../carts/entities/cart-item.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { OrderStatusHistory } from '../orders/entities/order-status-history.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Shipment } from '../shipments/entities/shipment.entity';
import { ShipmentEvent } from '../shipments/entities/shipment-event.entity';
import { Address } from '../addresses/entities/address.entity';
import { Favorite } from '../favorites/entities/favorite.entity';
import { ProductReview } from '../reviews/entities/product-review.entity';
import { Coupon } from '../coupons/entities/coupon.entity';
import { CouponRedemption } from '../coupons/entities/coupon-redemption.entity';
import { VendorProfile } from '../vendors/entities/vendor-profile.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { UserEvent } from '../events/entities/user-event.entity';
import { InitialSchema1779239600000 } from '../migrations/1779239600000-InitialSchema';
import { AddOrderFulfillmentFields1779243200000 } from '../migrations/1779243200000-AddOrderFulfillmentFields';
import { CreatePayments1779246800000 } from '../migrations/1779246800000-CreatePayments';
import { CreateShipments1779250400000 } from '../migrations/1779250400000-CreateShipments';
import { CreateAddresses1779254000000 } from '../migrations/1779254000000-CreateAddresses';
import { CreateCommerceExperienceModules1779257600000 } from '../migrations/1779257600000-CreateCommerceExperienceModules';
import { CreateUserEventsAndProductSignals1779261200000 } from '../migrations/1779261200000-CreateUserEventsAndProductSignals';
import { NormalizeLocalUploadUrls1779264800000 } from '../migrations/1779264800000-NormalizeLocalUploadUrls';
import { CreateOrderStatusHistory1779268400000 } from '../migrations/1779268400000-CreateOrderStatusHistory';

loadEnv({ path: '.env' });
loadEnv({ path: '../.env' });

const toNumber = (value: string | undefined, fallback: number): number =>
  value ? Number(value) : fallback;

const toBoolean = (value: string | undefined, fallback: boolean): boolean =>
  value ? value.toLowerCase() === 'true' : fallback;

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: toNumber(process.env.DB_PORT, 5432),
  database: process.env.DB_NAME ?? 'moheet_db',
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  entities: [
    User,
    Category,
    Product,
    ProductImage,
    Cart,
    CartItem,
    Order,
    OrderItem,
    OrderStatusHistory,
    Payment,
    Shipment,
    ShipmentEvent,
    Address,
    Favorite,
    ProductReview,
    Coupon,
    CouponRedemption,
    VendorProfile,
    Notification,
    UserEvent,
  ],
  migrations: [
    InitialSchema1779239600000,
    AddOrderFulfillmentFields1779243200000,
    CreatePayments1779246800000,
    CreateShipments1779250400000,
    CreateAddresses1779254000000,
    CreateCommerceExperienceModules1779257600000,
    CreateUserEventsAndProductSignals1779261200000,
    NormalizeLocalUploadUrls1779264800000,
    CreateOrderStatusHistory1779268400000,
  ],
  synchronize: false,
  migrationsRun: false,
  logging: toBoolean(process.env.DB_LOGGING, false),
});
