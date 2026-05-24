import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';
import { PaymentMethod, PaymentStatus } from '../../common/enums/payment.enum';

@Entity('payments')
@Index(['orderId'])
@Index(['customerId'])
@Index(['status'])
@Index(['createdAt'])
@Index(['providerReference'], {
  unique: true,
  where: '"provider_reference" IS NOT NULL',
})
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @Column({ type: 'varchar', length: 50 })
  method: PaymentMethod;

  @Column({
    type: 'varchar',
    length: 30,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: { to: (v) => v, from: (v) => parseFloat(v) },
  })
  amount: number;

  @Column({ type: 'char', length: 3, default: 'YER' })
  currency: string;

  @Column({ type: 'varchar', length: 80, default: 'INTERNAL_SIMULATOR' })
  provider: string;

  @Column({ name: 'provider_reference', type: 'varchar', length: 120, nullable: true })
  providerReference: string;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @Column({ name: 'authorized_at', type: 'timestamptz', nullable: true })
  authorizedAt: Date;

  @Column({ name: 'captured_at', type: 'timestamptz', nullable: true })
  capturedAt: Date;

  @Column({ name: 'failed_at', type: 'timestamptz', nullable: true })
  failedAt: Date;

  @Column({ name: 'refunded_at', type: 'timestamptz', nullable: true })
  refundedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
