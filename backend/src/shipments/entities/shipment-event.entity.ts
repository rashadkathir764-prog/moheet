import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ShipmentStatus } from '../../common/enums/shipment-status.enum';
import { Shipment } from './shipment.entity';

@Entity('shipment_events')
@Index(['shipmentId'])
@Index(['status'])
@Index(['occurredAt'])
export class ShipmentEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'shipment_id', type: 'uuid' })
  shipmentId: string;

  @ManyToOne(() => Shipment, (shipment) => shipment.events, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'shipment_id' })
  shipment: Shipment;

  @Column({ type: 'varchar', length: 30 })
  status: ShipmentStatus;

  @Column({ type: 'varchar', length: 150, nullable: true })
  location: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
