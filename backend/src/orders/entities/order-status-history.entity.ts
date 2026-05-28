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
import { OrderStatus } from '../../common/enums/order-status.enum';

@Entity('order_status_history')
@Index(['orderId'])
@Index(['createdAt'])
export class OrderStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, (order) => order.statusHistory, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({
    name: 'from_status',
    type: 'varchar',
    length: 30,
    enum: OrderStatus,
    nullable: true,
  })
  fromStatus: OrderStatus | null;

  @Column({
    name: 'to_status',
    type: 'varchar',
    length: 30,
    enum: OrderStatus,
  })
  toStatus: OrderStatus;

  @Column({ name: 'changed_by_user_id', type: 'uuid', nullable: true })
  changedByUserId: string | null;

  @Column({
    name: 'changed_by_role',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  changedByRole: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
