import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';
import { ShipmentStatus } from '../../common/enums/shipment-status.enum';
import { ShipmentEvent } from './shipment-event.entity';

@Entity('shipments')
@Index(['orderId'], { unique: true })
@Index(['customerId'])
@Index(['status'])
@Index(['trackingNumber'], {
  unique: true,
  where: '"tracking_number" IS NOT NULL',
})
export class Shipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid', unique: true })
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @Column({ name: 'carrier_name', type: 'varchar', length: 120 })
  carrierName: string;

  @Column({ name: 'tracking_number', type: 'varchar', length: 120 })
  trackingNumber: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: ShipmentStatus.READY_TO_SHIP,
  })
  status: ShipmentStatus;

  @Column({ type: 'varchar', length: 150, nullable: true })
  origin: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  destination: string;

  @Column({ name: 'shipped_at', type: 'timestamptz', nullable: true })
  shippedAt: Date;

  @Column({ name: 'estimated_delivery_at', type: 'timestamptz', nullable: true })
  estimatedDeliveryAt: Date;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt: Date;

  @OneToMany(() => ShipmentEvent, (event) => event.shipment, {
    cascade: true,
    eager: false,
  })
  events: ShipmentEvent[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
