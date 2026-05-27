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
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UploadProductImageDto } from './dto/upload-product-image.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { User } from '../users/entities/user.entity';
import { ProductImageUploadFile } from '../common/storage/local-file-storage.service';

/**
 * وحدة التحكم في المنتجات
 * المسارات: /api/v1/products/...
 *
 * صلاحيات القراءة:  عامة (بدون توثيق)
 * صلاحيات الكتابة: VENDOR (منتجاته فقط) أو ADMIN (الكل)
 */
@ApiTags('Products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // 📝 POST /api/v1/products — إنشاء منتج جديد
  // ─────────────────────────────────────────────────────────────────────────
  @Post()
  @Roles(Role.VENDOR, Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'إنشاء منتج جديد (VENDOR | ADMIN)' })
  @ApiResponse({ status: 201, description: 'تم إنشاء المنتج بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة' })
  @ApiResponse({ status: 403, description: 'غير مصرح' })
  async create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: User,
  ) {
    const product = await this.productsService.create(dto, user);
    return {
      success: true,
      message: 'تم إنشاء المنتج بنجاح',
      data: product,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 📋 GET /api/v1/products — قائمة المنتجات (عامة)
  // ─────────────────────────────────────────────────────────────────────────
  @Public()
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'جلب قائمة المنتجات مع فلاتر وبحث وتصفح بالصفحات' })
  @ApiQuery({ name: 'q', required: false, description: 'نص البحث' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query() query: QueryProductsDto,
    @CurrentUser() user?: User,
  ) {
    const result = await this.productsService.findAll(query, user);
    return {
      success: true,
      ...result,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 🔍 GET /api/v1/products/slug/:slug — جلب منتج بالـ Slug (عام)
  // ─────────────────────────────────────────────────────────────────────────
  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'جلب منتج بالـ Slug (SEO-friendly)' })
  async findBySlug(@Param('slug') slug: string) {
    const product = await this.productsService.findBySlug(slug);
    return {
      success: true,
      data: product,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 🔍 GET /api/v1/products/:id — جلب منتج بالـ ID (عام)
  // ─────────────────────────────────────────────────────────────────────────
  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'جلب منتج بالمعرف' })
  @ApiResponse({ status: 404, description: 'المنتج غير موجود' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const product = await this.productsService.findOne(id);
    return {
      success: true,
      data: product,
    };
  }

  @Post(':id/images')
  @Roles(Role.VENDOR, Role.ADMIN)
  @UseInterceptors(FileInterceptor('image'))
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'رفع صورة حقيقية وربطها بالمنتج (VENDOR | ADMIN)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: { type: 'string', format: 'binary' },
        altText: { type: 'string', example: 'صورة أمامية للمنتج' },
        sortOrder: { type: 'integer', example: 0 },
        makeMain: { type: 'string', enum: ['true', 'false'], example: 'true' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'تم رفع الصورة وربطها بالمنتج' })
  async uploadImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: ProductImageUploadFile,
    @Body() dto: UploadProductImageDto,
    @CurrentUser() user: User,
  ) {
    const product = await this.productsService.uploadImage(
      id,
      file,
      dto,
      user,
    );
    return {
      success: true,
      message: 'تم رفع صورة المنتج بنجاح',
      data: product,
    };
  }

  @Patch(':id/images/:imageId/main')
  @Roles(Role.VENDOR, Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'تعيين صورة رئيسية للمنتج' })
  async setMainImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @CurrentUser() user: User,
  ) {
    const product = await this.productsService.setMainImage(id, imageId, user);
    return {
      success: true,
      message: 'تم تعيين الصورة الرئيسية بنجاح',
      data: product,
    };
  }

  @Delete(':id/images/:imageId')
  @Roles(Role.VENDOR, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'حذف صورة من صور المنتج' })
  async deleteImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @CurrentUser() user: User,
  ) {
    const product = await this.productsService.deleteImage(id, imageId, user);
    return {
      success: true,
      message: 'تم حذف صورة المنتج بنجاح',
      data: product,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ✏️ PATCH /api/v1/products/:id — تحديث منتج
  // ─────────────────────────────────────────────────────────────────────────
  @Patch(':id')
  @Roles(Role.VENDOR, Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'تحديث منتج (VENDOR: منتجاته فقط | ADMIN: الكل)' })
  @ApiResponse({ status: 200, description: 'تم التحديث بنجاح' })
  @ApiResponse({ status: 403, description: 'غير مصرح بتعديل هذا المنتج' })
  @ApiResponse({ status: 404, description: 'المنتج غير موجود' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: User,
  ) {
    const product = await this.productsService.update(id, dto, user);
    return {
      success: true,
      message: 'تم تحديث المنتج بنجاح',
      data: product,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 🗑️ DELETE /api/v1/products/:id — حذف مرن
  // ─────────────────────────────────────────────────────────────────────────
  @Delete(':id')
  @Roles(Role.VENDOR, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'حذف مرن للمنتج (Soft Delete)' })
  @ApiResponse({ status: 200, description: 'تم الحذف بنجاح' })
  @ApiResponse({ status: 403, description: 'غير مصرح بحذف هذا المنتج' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.productsService.softRemove(id, user);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ♻️ PATCH /api/v1/products/:id/restore — استرجاع منتج محذوف (Admin)
  // ─────────────────────────────────────────────────────────────────────────
  @Patch(':id/restore')
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'استرجاع منتج محذوف (ADMIN فقط)' })
  async restore(@Param('id', ParseUUIDPipe) id: string) {
    const product = await this.productsService.restore(id);
    return {
      success: true,
      message: 'تم استرجاع المنتج بنجاح',
      data: product,
    };
  }
}
