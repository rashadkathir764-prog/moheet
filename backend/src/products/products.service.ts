import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, SelectQueryBuilder, QueryRunner } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto, ProductSortBy } from './dto/query-products.dto';
import { UploadProductImageDto } from './dto/upload-product-image.dto';
import { CategoriesService } from '../categories/categories.service';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';
import {
  StorageService,
  ProductImageUploadFile,
} from '../common/storage/storage.service';

/** شكل الاستجابة الموحد للقوائم المُصفَّحة */
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,

    @InjectRepository(ProductImage)
    private readonly imagesRepository: Repository<ProductImage>,

    private readonly categoriesService: CategoriesService,
    @Inject('STORAGE_SERVICE')
    private readonly storageService: StorageService,
    private readonly dataSource: DataSource,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // 📝 إنشاء منتج جديد
  // ─────────────────────────────────────────────────────────────────────────
  async create(dto: CreateProductDto, vendor: User): Promise<Product> {
    // التحقق من وجود التصنيف
    const categoryExists = await this.categoriesService.existsById(dto.categoryId);
    if (!categoryExists) {
      throw new BadRequestException(`التصنيف بالمعرف ${dto.categoryId} غير موجود`);
    }

    // توليد الـ slug تلقائياً من الاسم
    const slug = await this.generateUniqueSlug(dto.name);

    // استخدام Transaction لضمان إنشاء المنتج وصوره معاً
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const product = queryRunner.manager.create(Product, {
        ...dto,
        slug,
        vendorId: vendor.id,
        images: undefined, // نتعامل مع الصور بشكل منفصل
      });

      const savedProduct = await queryRunner.manager.save(Product, product);

      // حفظ الصور إذا وُجدت
      if (dto.images && dto.images.length > 0) {
        const images = dto.images.map((img, index) =>
          queryRunner.manager.create(ProductImage, {
            ...img,
            productId: savedProduct.id,
            sortOrder: img.sortOrder ?? index,
          }),
        );
        await queryRunner.manager.save(ProductImage, images);
      }

      await queryRunner.commitTransaction();

      return this.findOne(savedProduct.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 📋 جلب قائمة المنتجات مع فلاتر وبحث وترتيب وتصفح بالصفحات
  // ─────────────────────────────────────────────────────────────────────────
  async findAll(query: QueryProductsDto, requestingUser?: User): Promise<PaginatedResult<Product>> {
    const { page = 1, limit = 20, q, sortBy, includeInactive } = query;
    const skip = (page - 1) * limit;

    const qb: SelectQueryBuilder<Product> = this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.vendor', 'vendor')
      .leftJoinAndSelect('product.images', 'images');

    // ─── الفلاتر الأساسية ────────────────────────────────────────────────

    // المنتجات النشطة فقط — إلا للـ Admin أو إذا طلب صراحةً
    const canSeeInactive =
      requestingUser &&
      (requestingUser.role === Role.ADMIN ||
        requestingUser.role === Role.VENDOR);

    if (!includeInactive || !canSeeInactive) {
      qb.andWhere('product.isActive = :isActive', { isActive: true });
    }

    if (query.categoryId) {
      qb.andWhere('product.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }

    if (query.vendorId) {
      qb.andWhere('product.vendorId = :vendorId', {
        vendorId: query.vendorId,
      });
    }

    if (query.brand) {
      qb.andWhere('LOWER(product.brand) = LOWER(:brand)', {
        brand: query.brand.trim(),
      });
    }

    if (query.tag) {
      qb.andWhere(':tag = ANY(product.tags)', {
        tag: query.tag.trim(),
      });
    }

    if (query.isFeatured !== undefined) {
      qb.andWhere('product.isFeatured = :isFeatured', {
        isFeatured: query.isFeatured,
      });
    }

    // ─── فلتر نطاق السعر ─────────────────────────────────────────────────

    if (query.minPrice !== undefined) {
      qb.andWhere('product.price >= :minPrice', { minPrice: query.minPrice });
    }

    if (query.maxPrice !== undefined) {
      qb.andWhere('product.price <= :maxPrice', { maxPrice: query.maxPrice });
    }

    // ─── البحث النصي الكامل (Full-Text Search) ──────────────────────────
    /**
     * يستخدم pg_trgm للبحث في الاسم والوصف بتشابه نصي
     * متوافق مع العربية دون الحاجة لـ dictionary عربية مخصصة
     * الحد الأدنى للتشابه: 0.1 (يمكن رفعه لتقليل النتائج غير الدقيقة)
     */
    if (q && q.trim().length >= 2) {
      qb.andWhere(
        `(
          product.name ILIKE :search
          OR product.description ILIKE :search
          OR product.sku ILIKE :search
        )`,
        { search: `%${q.trim()}%` },
      );

      // إضافة relevance score للترتيب بالأقرب للبحث
      qb.addSelect(
        `GREATEST(
          similarity(product.name, :qTrgm),
          similarity(COALESCE(product.description, ''), :qTrgm)
        )`,
        'relevance',
      ).setParameter('qTrgm', q.trim());
    }

    // ─── الترتيب (Sorting) ───────────────────────────────────────────────

    if (q && q.trim().length >= 2) {
      // عند البحث: الأكثر تطابقاً أولاً
      qb.orderBy('relevance', 'DESC');
    } else {
      switch (sortBy) {
        case ProductSortBy.PRICE_ASC:
          qb.orderBy('product.price', 'ASC');
          break;
        case ProductSortBy.PRICE_DESC:
          qb.orderBy('product.price', 'DESC');
          break;
        case ProductSortBy.NAME_AZ:
          qb.orderBy('product.name', 'ASC');
          break;
        case ProductSortBy.OLDEST:
          qb.orderBy('product.createdAt', 'ASC');
          break;
        case ProductSortBy.NEWEST:
        default:
          qb.orderBy('product.createdAt', 'DESC');
          break;
      }
    }

    // ترتيب الصور داخل كل منتج
    qb.addOrderBy('images.sortOrder', 'ASC');

    // ─── التصفح بالصفحات ─────────────────────────────────────────────────

    const [data, total] = await qb
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 🔍 جلب منتج واحد بالـ ID
  // ─────────────────────────────────────────────────────────────────────────
  async findOne(id: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: ['category', 'vendor', 'images'],
      order: { images: { sortOrder: 'ASC' } },
    });

    if (!product) {
      throw new NotFoundException(`المنتج بالمعرف ${id} غير موجود`);
    }

    return product;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 🔍 جلب منتج بالـ Slug (للـ SEO-friendly URLs)
  // ─────────────────────────────────────────────────────────────────────────
  async findBySlug(slug: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { slug, isActive: true },
      relations: ['category', 'vendor', 'images'],
      order: { images: { sortOrder: 'ASC' } },
    });

    if (!product) {
      throw new NotFoundException(`المنتج "${slug}" غير موجود`);
    }

    return product;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ✏️ تحديث المنتج (مع التحقق من الصلاحية)
  // ─────────────────────────────────────────────────────────────────────────
  async update(id: string, dto: UpdateProductDto, requestingUser: User): Promise<Product> {
    const product = await this.findOne(id);

    // التحقق من الصلاحية: البائع يعدّل منتجاته فقط، الـ Admin يعدّل الكل
    this.assertCanModify(product, requestingUser);

    // إذا تغير الاسم — توليد slug جديد
    if (dto.name && dto.name !== product.name) {
      dto['slug'] = await this.generateUniqueSlug(dto.name, id);
    }

    // التحقق من التصنيف الجديد إذا تغيّر
    if (dto.categoryId && dto.categoryId !== product.categoryId) {
      const exists = await this.categoriesService.existsById(dto.categoryId);
      if (!exists) {
        throw new BadRequestException(`التصنيف بالمعرف ${dto.categoryId} غير موجود`);
      }
    }

    const { images, ...productData } = dto;

    await this.productsRepository.update(id, productData as any);

    // تحديث الصور إذا أُرسلت (استبدال كامل)
    if (images !== undefined) {
      await this.imagesRepository.delete({ productId: id });

      if (images.length > 0) {
        const newImages = images.map((img, index) =>
          this.imagesRepository.create({
            ...img,
            productId: id,
            sortOrder: img.sortOrder ?? index,
          }),
        );
        await this.imagesRepository.save(newImages);
      }
    }

    return this.findOne(id);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 🗑️ حذف مرن (Soft Delete)
  // ─────────────────────────────────────────────────────────────────────────
  async softRemove(id: string, requestingUser: User): Promise<{ message: string }> {
    const product = await this.findOne(id);

    this.assertCanModify(product, requestingUser);

    await this.productsRepository.softDelete(id);

    return { message: `تم حذف المنتج "${product.name}" بنجاح` };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ♻️ استرجاع منتج محذوف (Admin فقط)
  // ─────────────────────────────────────────────────────────────────────────
  async restore(id: string): Promise<Product> {
    const result = await this.productsRepository.restore(id);

    if (result.affected === 0) {
      throw new NotFoundException(`لا يوجد منتج محذوف بالمعرف ${id}`);
    }

    return this.findOne(id);
  }

  async uploadImage(
    productId: string,
    file: ProductImageUploadFile,
    dto: UploadProductImageDto,
    requestingUser: User,
  ): Promise<Product> {
    const product = await this.findOne(productId);
    this.assertCanModify(product, requestingUser);

    const storedFile = await this.storageService.storeProductImage(
      file,
    );

    try {
      const sortOrder =
        dto.sortOrder ??
        (product.images && product.images.length > 0
          ? product.images.length
          : 0);
      const image = this.imagesRepository.create({
        productId: product.id,
        imageUrl: storedFile.publicUrl,
        altText: dto.altText,
        sortOrder,
      });

      await this.imagesRepository.save(image);

      if (dto.makeMain === 'true' || !product.thumbnailUrl) {
        await this.productsRepository.update(product.id, {
          thumbnailUrl: storedFile.publicUrl,
        });
      }

      return this.findOne(product.id);
    } catch (error) {
      await this.storageService.deleteByPublicUrl(storedFile.publicUrl);
      throw error;
    }
  }

  async setMainImage(
    productId: string,
    imageId: string,
    requestingUser: User,
  ): Promise<Product> {
    const product = await this.findOne(productId);
    this.assertCanModify(product, requestingUser);

    const image = await this.imagesRepository.findOne({
      where: { id: imageId, productId: product.id },
    });

    if (!image) {
      throw new NotFoundException('صورة المنتج غير موجودة');
    }

    await this.productsRepository.update(product.id, {
      thumbnailUrl: image.imageUrl,
    });

    return this.findOne(product.id);
  }

  async deleteImage(
    productId: string,
    imageId: string,
    requestingUser: User,
  ): Promise<Product> {
    const product = await this.findOne(productId);
    this.assertCanModify(product, requestingUser);

    const image = await this.imagesRepository.findOne({
      where: { id: imageId, productId: product.id },
    });

    if (!image) {
      throw new NotFoundException('صورة المنتج غير موجودة');
    }

    await this.imagesRepository.delete({ id: image.id });
    await this.storageService.deleteByPublicUrl(image.imageUrl);

    if (product.thumbnailUrl === image.imageUrl) {
      const nextImage = await this.imagesRepository.findOne({
        where: { productId: product.id },
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      });

      await this.productsRepository.update(product.id, {
        thumbnailUrl: nextImage?.imageUrl ?? null,
      });
    }

    return this.findOne(product.id);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 📦 تعديل المخزون (للاستخدام الداخلي من OrdersModule)
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * ينقص المخزون بأمان — يُستخدَم داخل Transaction من OrdersService
   * يرفع BadRequestException إذا كان المخزون غير كافٍ
   */
  async decrementStock(
    productId: string,
    quantity: number,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.dataSource.manager;

    const result = await manager
      .createQueryBuilder()
      .update(Product)
      .set({ stockQuantity: () => `stock_quantity - ${quantity}` })
      .where('id = :id AND stock_quantity >= :qty', {
        id: productId,
        qty: quantity,
      })
      .execute();

    if (result.affected === 0) {
      throw new BadRequestException(
        `المخزون غير كافٍ للمنتج ${productId}. الكمية المطلوبة: ${quantity}`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 🔧 دوال مساعدة خاصة
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * توليد slug فريد من اسم المنتج
   * يُحوِّل: "سماعات Pro Max 2" ← "smaat-pro-max-2" ← مع رقم عشوائي إذا كان مكرراً
   */
  private async generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
    // تحويل الاسم لـ slug (يدعم العربية عبر الحروف الإنجليزية في الاسم)
    let baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-')      // مسافات وشرطات سفلية ← شرطة
      .replace(/[^\w\u0600-\u06FF-]/g, '') // احتفظ بالعربية والإنجليزية والأرقام
      .replace(/--+/g, '-')         // شرطات متعددة ← شرطة واحدة
      .replace(/^-|-$/g, '');       // إزالة الشرطات من البداية والنهاية

    if (!baseSlug) {
      baseSlug = `product-${Date.now()}`;
    }

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const qb = this.productsRepository
        .createQueryBuilder('p')
        .where('p.slug = :slug', { slug })
        .withDeleted(); // تضمين المحذوفين في الفحص

      if (excludeId) {
        qb.andWhere('p.id != :excludeId', { excludeId });
      }

      const existing = await qb.getOne();

      if (!existing) break;

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * التحقق من أن المستخدم يملك صلاحية تعديل/حذف هذا المنتج
   * ADMIN: يعدّل كل شيء
   * VENDOR: يعدّل منتجاته فقط
   */
  private assertCanModify(product: Product, user: User): void {
    if (user.role === Role.ADMIN) return;

    if (user.role === Role.VENDOR && product.vendorId === user.id) return;

    throw new ForbiddenException(
      'ليس لديك صلاحية لتعديل أو حذف هذا المنتج',
    );
  }
}
