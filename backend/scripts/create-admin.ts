import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';
import { Role } from '../src/common/enums/role.enum';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from the root of the project before NestJS bootstraps
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function bootstrap() {
  console.log('🔄 جاري تهيئة بيئة NestJS لإنشاء حساب المدير...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  const email = process.env.ADMIN_EMAIL ?? 'admin@moheet.com';
  const password = process.env.ADMIN_PASSWORD ?? process.env.DEMO_SEED_PASSWORD;

  if (!password) {
    throw new Error('ADMIN_PASSWORD or DEMO_SEED_PASSWORD must be set before creating admin user');
  }
  
  try {
    const existing = await usersService.findByEmail(email);
    if (existing) {
      console.log('⚠️ حساب المدير موجود مسبقاً في قاعدة البيانات.');
    } else {
      console.log('⏳ جاري إنشاء الحساب وتشفير كلمة المرور...');
      const passwordHash = await bcrypt.hash(password, 12);
      
      await usersService.create({
        email,
        passwordHash,
        fullName: 'المدير العام',
        role: Role.ADMIN,
        isActive: true,
        isVerified: true,
      });

      console.log('✅ تم إنشاء حساب المدير بنجاح!');
      console.log('-----------------------------------');
      console.log(`📧 البريد الإلكتروني: ${email}`);
      console.log('🔑 كلمة المرور:       <configured in environment>');
      console.log('-----------------------------------');
    }
  } catch (error) {
    console.error('❌ حدث خطأ أثناء إنشاء الحساب:', error);
  } finally {
    await app.close();
    process.exit(0);
  }
}

bootstrap();
