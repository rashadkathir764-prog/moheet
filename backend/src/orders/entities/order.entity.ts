import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { PaymentMethod, PaymentStatus } from '../../common/enums/payment.enum';

/**
 * بنية عنوان الشحن — تُخزَّن كـ JSONB
 * لقطة (Snapshot) من بيانات الشحن وقت الطلب
 * لا تتأثر إذا غيّر المستخدم عنوانه لاحقاً
 */
interface ShippingAddressSnapshot {
  fullName: string;
  phone: string;
  fullAddress: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

/**
 * كيان الطلب — يمثل المعاملة الشرائية الكاملة
 *
 * ملاحظات معمارية:
 * - عنوان الشحن يُخزَّن كـ JSONB (snapshot) لا كـ FK
 *   → لمنع تأثر سجل الطلب بتعديلات المستخدم لعناوينه لاحقاً
 * - المبالغ مُفصَّلة (subtotal + shipping + discount = total)
 *   → للشفافية المالية والتدقيق
 */
@Entity('orders')
@Index(['customerId'])
@Index(['status'])
@Index(['paymentStatus'])
@Index(['createdAt'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ─── المستخدم ─────────────────────────────────────────────────────────────

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  // ─── عناصر الطلب ─────────────────────────────────────────────────────────

  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: true,
    eager: false,
  })
  items: OrderItem[];

  // ─── عنوان الشحن (JSONB Snapshot) ────────────────────────────────────────

  @Column({ name: 'shipping_address', type: 'jsonb' })
  shippingAddress: ShippingAddressSnapshot;

  // ─── الحالات ─────────────────────────────────────────────────────────────

  @Column({
    type: 'varchar',
    length: 30,
    default: OrderStatus.PENDING,
    enum: OrderStatus,
  })
  status: OrderStatus;

  @Column({
    name: 'payment_method',
    type: 'varchar',
    length: 50,
    default: PaymentMethod.CASH_ON_DELIVERY,
    enum: PaymentMethod,
  })
  paymentMethod: PaymentMethod;

  @Column({
    name: 'payment_status',
    type: 'varchar',
    length: 30,
    default: PaymentStatus.PENDING,
    enum: PaymentStatus,
  })
  paymentStatus: PaymentStatus;

  // ─── الحسابات المالية ────────────────────────────────────────────────────

  /**
   * المجموع الفرعي = مجموع (سعر × كمية) لكل عنصر
   * يُحسَب وقت إنشاء الطلب ولا يتغير لاحقاً
   */
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: { to: (v) => v, from: (v) => parseFloat(v) },
  })
  subtotal: number;

  @Column({
    name: 'shipping_fee',
    type: 'decimal',
    precision: 8,
    scale: 2,
    default: 0,
    transformer: { to: (v) => v, from: (v) => parseFloat(v) },
  })
  shippingFee: number;

  @Column({
    name: 'discount_amount',
    type: 'decimal',
    precision: 8,
    scale: 2,
    default: 0,
    transformer: { to: (v) => v, from: (v) => parseFloat(v) },
  })
  discountAmount: number;

  @Column({ name: 'coupon_code', type: 'varchar', length: 40, nullable: true })
  couponCode: string;

  /**
   * المبلغ الإجمالي = subtotal + shippingFee - discountAmount
   * المرجع الرسمي للدفع
   */
  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: { to: (v) => v, from: (v) => parseFloat(v) },
  })
  totalAmount: number;

  // ─── ملاحظات ─────────────────────────────────────────────────────────────

  @Column({ type: 'text', nullable: true })
  notes: string;

  // ─── ملاحظات الإدارة الداخلية ────────────────────────────────────────────

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes: string;

  @Column({
    name: 'shipping_carrier',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  shippingCarrier: string;

  @Column({
    name: 'tracking_number',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  trackingNumber: string;

  @Column({ name: 'shipped_at', type: 'timestamptz', nullable: true })
  shippedAt: Date;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt: Date;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date;

  @Column({ name: 'refunded_at', type: 'timestamptz', nullable: true })
  refundedAt: Date;

  // ─── التواريخ ─────────────────────────────────────────────────────────────

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
