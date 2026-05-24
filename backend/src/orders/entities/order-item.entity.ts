import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Order } from './order.entity';
import { Product } from '../../products/entities/product.entity';

/**
 * كيان عنصر الطلب — الأهم مالياً في المنظومة
 *
 * ⚠️ مبدأ اللقطة (Snapshot Principle):
 * يُخزَّن السعر والاسم ومعرف البائع وقت الشراء ولا يتغير أبداً.
 * حتى لو عدّل البائع سعر المنتج لاحقاً — يبقى الطلب القديم بسعره الأصلي.
 * هذا ضروري لـ: الفواتير الدقيقة، تقارير المبيعات، الاسترجاع المالي.
 */
@Entity('order_items')
@Index(['orderId'])
@Index(['productId'])
@Index(['vendorId']) // فهرس حيوي — يُستخدَم في استعلامات VENDOR
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ─── الطلب ────────────────────────────────────────────────────────────────

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, (order) => order.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  // ─── المنتج (FK حي) ───────────────────────────────────────────────────────

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  // ─── لقطات بيانات المنتج وقت الشراء (Snapshots) ─────────────────────────

  /**
   * اسم المنتج وقت الشراء — لا يتأثر بتعديلات البائع للاسم
   */
  @Column({ name: 'product_name', type: 'varchar', length: 255 })
  productName: string;

  /**
   * الصورة المصغرة وقت الشراء — لعرضها في صفحة "طلباتي"
   */
  @Column({ name: 'product_thumbnail', type: 'text', nullable: true })
  productThumbnail: string;

  /**
   * معرف البائع وقت الشراء — حيوي لتصفية طلبات VENDOR
   * مُخزَّن كـ snapshot لمنع الاختلاط إذا تغير مالك المنتج
   */
  @Column({ name: 'vendor_id', type: 'uuid' })
  vendorId: string;

  /**
   * ⭐ السعر وقت الشراء — الحقل الأهم في النظام المالي
   * لا علاقة له بـ product.price الحالي — ثابت إلى الأبد
   */
  @Column({
    name: 'price_at_purchase',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: { to: (v) => v, from: (v) => parseFloat(v) },
  })
  priceAtPurchase: number;

  @Column({ type: 'int' })
  quantity: number;

  /**
   * المجموع الفرعي = priceAtPurchase × quantity
   * مُخزَّن صراحةً لسرعة الاستعلام وعدم إعادة الحساب
   */
  @Column({
    name: 'total_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: { to: (v) => v, from: (v) => parseFloat(v) },
  })
  totalPrice: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
