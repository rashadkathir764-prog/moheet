import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum VendorStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

@Entity('vendor_profiles')
@Index(['status'])
@Index(['slug'], { unique: true })
export class VendorProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'store_name', type: 'varchar', length: 160 })
  storeName: string;

  @Column({ type: 'varchar', length: 180, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'business_email', type: 'varchar', length: 255, nullable: true })
  businessEmail: string;

  @Column({ name: 'business_phone', type: 'varchar', length: 30, nullable: true })
  businessPhone: string;

  @Column({ name: 'business_address', type: 'text', nullable: true })
  businessAddress: string;

  @Column({ type: 'varchar', length: 20, default: VendorStatus.PENDING })
  status: VendorStatus;

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes: string;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
