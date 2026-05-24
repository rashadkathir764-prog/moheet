import { BadRequestException, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { CategoriesModule } from '../categories/categories.module';
import { LocalFileStorageService } from '../common/storage/local-file-storage.service';
import { CloudinaryStorageService } from '../common/storage/cloudinary-storage.service';
import { HybridStorageService } from '../common/storage/hybrid-storage.service';

@Module({
  imports: [
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        limits: {
          fileSize: Number(
            configService.get<string>('MAX_FILE_SIZE', '5242880'),
          ),
          files: 1,
        },
        fileFilter: (_request, file, callback) => {
          const allowedTypes = configService
            .get<string>('ALLOWED_IMAGE_TYPES', 'image/jpeg,image/png,image/webp')
            .split(',')
            .map((type) => type.trim());

          if (!allowedTypes.includes(file.mimetype)) {
            callback(
              new BadRequestException(
                `نوع الصورة غير مسموح. الأنواع المسموحة: ${allowedTypes.join(', ')}`,
              ),
              false,
            );
            return;
          }

          callback(null, true);
        },
      }),
    }),
    TypeOrmModule.forFeature([Product, ProductImage]),
    CategoriesModule, // لاستخدام CategoriesService في التحقق
  ],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    LocalFileStorageService,
    CloudinaryStorageService,
    HybridStorageService,
    {
      provide: 'STORAGE_SERVICE',
      useClass: HybridStorageService,
    },
  ],
  exports: [ProductsService], // يُصدَّر لـ OrdersModule لإدارة المخزون
})
export class ProductsModule {}
