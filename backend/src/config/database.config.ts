import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';
import { Product } from '../products/entities/product.entity';
import { ProductImage } from '../products/entities/product-image.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Cart } from '../carts/entities/cart.entity';
import { CartItem } from '../carts/entities/cart-item.entity';
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

const parseBoolean = (
  value: string | boolean | undefined,
  defaultValue: boolean,
): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return defaultValue;
};

/**
 * إعداد TypeORM بشكل غير متزامن لقراءة البيانات من .env
 * يُستخدَم في AppModule داخل TypeOrmModule.forRootAsync()
 */
export const databaseConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    host: config.get<string>('DB_HOST', 'localhost'),
    port: config.get<number>('DB_PORT', 5432),
    database: config.get<string>('DB_NAME', 'moheet_db'),
    username: config.get<string>('DB_USER'),
    password: config.get<string>('DB_PASSWORD'),

    // الـ Entities: تُضاف هنا عند إنشاء كل موديل جديد
    entities: [
      User,
      Category,
      Product,
      ProductImage,
      Cart,
      CartItem,
      Order,
      OrderItem,
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
    ],

    // true في التطوير فقط — يزامن الـ Schema تلقائياً
    // في الإنتاج: false واستخدم Migrations دائماً
    synchronize: parseBoolean(config.get('DB_SYNCHRONIZE'), false),
    migrationsRun: parseBoolean(config.get('DB_MIGRATIONS_RUN'), false),

    // تسجيل استعلامات SQL في وضع التطوير
    logging: parseBoolean(
      config.get('DB_LOGGING'),
      config.get<string>('NODE_ENV') === 'development',
    ),

    // إعدادات الاتصال المتعدد (Connection Pool)
    extra: {
      max: 10,              // الحد الأقصى للاتصالات المتزامنة
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    },

    // إعادة المحاولة عند فشل الاتصال الأولي
    retryAttempts: 5,
    retryDelay: 3000,
  }),
};
