import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum UserEventType {
  PRODUCT_VIEW = 'product_view',
  SEARCH = 'search',
  ADD_TO_CART = 'add_to_cart',
  UPDATE_CART = 'update_cart',
  REMOVE_FROM_CART = 'remove_from_cart',
  CLEAR_CART = 'clear_cart',
  ADD_TO_FAVORITES = 'add_to_favorites',
  REMOVE_FROM_FAVORITES = 'remove_from_favorites',
  CHECKOUT_STARTED = 'checkout_started',
  PURCHASE = 'purchase',
  RECOMMENDATION_IMPRESSION = 'recommendation_impression',
  RECOMMENDATION_CLICK = 'recommendation_click',
}

export enum UserEventSource {
  WEB = 'web',
  MOBILE = 'mobile',
  API = 'api',
}

@Entity('user_events')
@Index(['type', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['sessionId', 'createdAt'])
@Index(['productId', 'createdAt'])
export class UserEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'session_id', type: 'varchar', length: 128, nullable: true })
  sessionId: string | null;

  @Column({ type: 'varchar', length: 60 })
  type: UserEventType;

  @Column({ type: 'varchar', length: 20, default: UserEventSource.WEB })
  source: UserEventSource;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId: string | null;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId: string | null;

  @Column({ name: 'search_query', type: 'varchar', length: 255, nullable: true })
  searchQuery: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
