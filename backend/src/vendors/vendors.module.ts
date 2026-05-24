import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VendorProfile } from './entities/vendor-profile.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([VendorProfile, User]),
    NotificationsModule,
  ],
  controllers: [VendorsController],
  providers: [VendorsService],
})
export class VendorsModule {}
