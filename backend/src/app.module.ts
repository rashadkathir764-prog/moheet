import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { databaseConfig } from './config/database.config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { CartsModule } from './carts/carts.module';
import { PaymentsModule } from './payments/payments.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { AddressesModule } from './addresses/addresses.module';
import { FavoritesModule } from './favorites/favorites.module';
import { ReviewsModule } from './reviews/reviews.module';
import { CouponsModule } from './coupons/coupons.module';
import { VendorsModule } from './vendors/vendors.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EventsModule } from './events/events.module';
import { RecommendationsModule } from './recommendations/recommendations.module';

@Module({
  imports: [
    // ─── تحميل المتغيرات البيئية عالمياً ─────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,       // متاح في كل الموديلات بدون إعادة استيراد
      envFilePath: ['.env', '../.env'],
      cache: true,          // تحسين الأداء: تخزين مؤقت لقيم .env
    }),

    // ─── الاتصال بقاعدة البيانات ───────────────────────────────────────────
    TypeOrmModule.forRootAsync(databaseConfig),

    // ─── الحماية من الطلبات المتكررة (Rate Limiting) ──────────────────────
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          name: 'global',
          ttl: configService.get<number>('THROTTLE_TTL_MS', 60000),
          limit: configService.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
    }),

    // ─── الموديلات الأساسية ────────────────────────────────────────────────
    UsersModule,
    AuthModule,
    CategoriesModule,
    ProductsModule,
    CartsModule,
    OrdersModule,
    PaymentsModule,
    ShipmentsModule,
    AddressesModule,
    FavoritesModule,
    ReviewsModule,
    CouponsModule,
    VendorsModule,
    NotificationsModule,
    EventsModule,
    RecommendationsModule,
  ],

  // ─── تسجيل ThrottlerGuard عالمياً عبر APP_GUARD ───────────────────────────
  // يُطبَّق تلقائياً على جميع المسارات دون الحاجة لتعديل أي Controller
  // لتعطيل Rate Limiting على endpoint معين: أضف @SkipThrottle() عليه
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
