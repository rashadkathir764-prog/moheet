import { NestFactory } from '@nestjs/core';
import {
  ClassSerializerInterceptor,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser = require('cookie-parser');
import { static as serveStatic } from 'express';
import { resolve } from 'path';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('API_PORT', 3000);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // ─── الأمان: حماية رؤوس HTTP ───────────────────────────────────────────────
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cookieParser());

  const uploadRoot = resolve(
    process.cwd(),
    configService.get<string>('UPLOAD_DEST', './uploads'),
  );
  app.use('/uploads', serveStatic(uploadRoot));

  // ─── CORS: السماح فقط بالنطاقات المحددة ───────────────────────────────────
  const corsOrigins = configService
    .get<string>('CORS_ORIGINS', 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true, // ضروري للـ HttpOnly Cookies (Refresh Token)
  });

  // ─── Global Prefix: /api/v1 ────────────────────────────────────────────────
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // ─── Validation Pipe العالمي ───────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // يحذف الحقول غير المعلنة في الـ DTO
      forbidNonWhitelisted: true, // يرفع خطأ إذا وُجدت حقول غير مسموح بها
      transform: true,           // يحوّل البيانات تلقائياً للأنواع المعلنة
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  // ─── Global Exception Filter: معالجة الأخطاء بشكل موحد ──────────────────
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ─── Swagger: وثائق API تفاعلية (في التطوير فقط) ─────────────────────────
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('MOHEET API | مُحِيط')
      .setDescription('واجهة برمجية لمنظومة التجارة الإلكترونية مُحِيط')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addTag('Auth', 'نظام المصادقة والتوثيق')
      .addTag('Users', 'إدارة المستخدمين')
      .addTag('Products', 'إدارة المنتجات')
      .addTag('Orders', 'إدارة الطلبات')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });

    console.log(`\n📚 Swagger Docs: http://localhost:${port}/api/docs`);
  }

  await app.listen(port);

  console.log(`\n🚀 MOHEET API is running:`);
  console.log(`   ➜ Local:   http://localhost:${port}/api/v1`);
  console.log(`   ➜ Env:     ${nodeEnv}`);
  console.log(`   ➜ Status:  Ready ✅\n`);
}

bootstrap();
