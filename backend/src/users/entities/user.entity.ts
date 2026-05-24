import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Role } from '../../common/enums/role.enum';

/**
 * كيان المستخدم — يعكس جدول `users` في قاعدة البيانات بالكامل
 * مطابق لمخطط docs/database-schema.md
 */
@Entity('users')
@Index(['email'])
@Index(['role'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  /**
   * كلمة المرور مُشفَّرة بـ bcrypt (salt rounds: 12)
   * @Exclude() تمنع ظهورها في الاستجابات عبر class-transformer
   */
  @Exclude()
  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName: string;

  @Column({ type: 'varchar', length: 20, nullable: true, unique: true })
  phone: string;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: Role.CUSTOMER,
    enum: Role,
  })
  role: Role;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified: boolean;

  /**
   * Refresh Token مُشفَّر — يُفرَّغ عند الـ logout
   * @Exclude() لمنع كشفه في الاستجابات
   */
  @Exclude()
  @Column({ name: 'refresh_token', type: 'text', nullable: true })
  refreshToken: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
