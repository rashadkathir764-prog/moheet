import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Product } from './product.entity';

/**
 * كيان صور المنتجات — منتج واحد يملك صوراً متعددة
 * الصور مرتبة عبر sort_order
 */
@Entity('product_images')
@Index(['productId'])
export class ProductImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, (product) => product.images, {
    onDelete: 'CASCADE', // تُحذَف تلقائياً مع حذف المنتج
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'image_url', type: 'text' })
  imageUrl: string;

  @Column({ name: 'alt_text', type: 'varchar', length: 255, nullable: true })
  altText: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
