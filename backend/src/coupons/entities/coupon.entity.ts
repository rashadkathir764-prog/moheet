import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CouponRedemption } from './coupon-redemption.entity';

export enum CouponDiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

@Entity('coupons')
@Index(['code'], { unique: true })
@Index(['isActive'])
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 20 })
  type: CouponDiscountType;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: { to: (v) => v, from: (v) => parseFloat(v) },
  })
  value: number;

  @Column({
    name: 'min_order_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: { to: (v) => v, from: (v) => parseFloat(v) },
  })
  minOrderAmount: number;

  @Column({
    name: 'max_discount_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: { to: (v) => v, from: (v) => (v ? parseFloat(v) : null) },
  })
  maxDiscountAmount: number;

  @Column({ name: 'usage_limit', type: 'int', nullable: true })
  usageLimit: number;

  @Column({ name: 'used_count', type: 'int', default: 0 })
  usedCount: number;

  @Column({ name: 'per_user_limit', type: 'int', default: 1 })
  perUserLimit: number;

  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true })
  startsAt: Date;

  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
  endsAt: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => CouponRedemption, (redemption) => redemption.coupon)
  redemptions: CouponRedemption[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
