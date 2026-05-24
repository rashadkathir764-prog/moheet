import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Category } from '../../categories/entities/category.entity';
import { ProductImage } from './product-image.entity';

/**
 * كيان المنتج — يعكس جدول `products` في قاعدة البيانات
 *
 * ميزات خاصة:
 * - Soft Delete عبر @DeleteDateColumn (deleted_at)
 * - Indexes على الحقول الأكثر استعلاماً للأداء
 * - دعم Full-Text Search العربي عبر GIN Index في 01_init.sql
 * - compare_price لعرض نسبة الخصم تلقائياً في الواجهة
 */
@Entity('products')
@Index(['slug'], { unique: true })
@Index(['sku'], { unique: true, where: '"sku" IS NOT NULL' })
@Index(['vendorId'])
@Index(['categoryId'])
@Index(['isActive'])
@Index(['isFeatured'])
@Index(['price'])
@Index(['createdAt'])
@Index(['brand'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ─── العلاقات ─────────────────────────────────────────────────────────────

  @Column({ name: 'vendor_id', type: 'uuid' })
  vendorId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: User;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => Category, (category) => category.products, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @OneToMany(() => ProductImage, (image) => image.product, {
    cascade: true,
    eager: false,
  })
  images: ProductImage[];

  // ─── بيانات المنتج الأساسية ───────────────────────────────────────────────

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // ─── التسعير ─────────────────────────────────────────────────────────────

  /**
   * السعر الحالي — الذي يدفعه العميل فعلياً
   * CHECK (price >= 0) مُطبَّق على مستوى قاعدة البيانات
   */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value), // TypeORM يُرجع decimal كـ string
    },
  })
  price: number;

  /**
   * السعر الأصلي قبل الخصم (اختياري)
   * إذا كان compare_price > price ← تُعرَض نسبة الخصم في الواجهة
   */
  @Column({
    name: 'compare_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => (value ? parseFloat(value) : null),
    },
  })
  comparePrice: number;

  // ─── المخزون والتعريف ─────────────────────────────────────────────────────

  @Column({ type: 'varchar', length: 100, nullable: true, unique: true })
  sku: string; // Stock Keeping Unit — رمز المنتج في المستودع

  @Column({ type: 'varchar', length: 120, nullable: true })
  brand: string;

  @Column({ type: 'text', array: true, default: () => 'ARRAY[]::text[]' })
  tags: string[];

  @Column({
    name: 'stock_quantity',
    type: 'int',
    default: 0,
  })
  stockQuantity: number;

  // ─── الحالة والإعدادات ────────────────────────────────────────────────────

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured: boolean;

  // ─── بيانات إضافية ───────────────────────────────────────────────────────

  @Column({
    name: 'weight_kg',
    type: 'decimal',
    precision: 6,
    scale: 3,
    nullable: true,
    transformer: {
      to: (v: number) => v,
      from: (v: string) => (v ? parseFloat(v) : null),
    },
  })
  weightKg: number;

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnailUrl: string;

  @Column({ name: 'view_count', type: 'int', default: 0 })
  viewCount: number;

  @Column({ name: 'cart_add_count', type: 'int', default: 0 })
  cartAddCount: number;

  @Column({ name: 'purchase_count', type: 'int', default: 0 })
  purchaseCount: number;

  @Column({ name: 'favorite_count', type: 'int', default: 0 })
  favoriteCount: number;

  @Column({
    name: 'rating_average',
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  ratingAverage: number;

  @Column({ name: 'review_count', type: 'int', default: 0 })
  reviewCount: number;

  // ─── التواريخ ─────────────────────────────────────────────────────────────

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  /**
   * Soft Delete — يُعيَّن تلقائياً عند استدعاء softDelete()
   * TypeORM يستثني هذه السجلات تلقائياً من كل استعلامات find()
   */
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date;

  // ─── حقول محسوبة (Computed — لا تُخزَّن في DB) ──────────────────────────

  /** نسبة الخصم — تُحسَب في الكود ولا تُخزَّن */
  get discountPercent(): number | null {
    if (this.comparePrice && this.comparePrice > this.price) {
      return Math.round(((this.comparePrice - this.price) / this.comparePrice) * 100);
    }
    return null;
  }

  /** هل المنتج متاح للشراء؟ */
  get isAvailable(): boolean {
    return this.isActive && this.stockQuantity > 0 && !this.deletedAt;
  }
}
