import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { UserEvent } from '../events/entities/user-event.entity';

@Injectable()
export class RecommendationsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(UserEvent)
    private readonly eventsRepository: Repository<UserEvent>,
  ) {}

  async trending(limit = 10): Promise<Product[]> {
    return this.baseProductQuery()
      .addSelect(
        `(
          product.view_count
          + product.cart_add_count * 3
          + product.favorite_count * 4
          + product.purchase_count * 8
          + product.review_count * 2
          + product.rating_average * 5
        )`,
        'score',
      )
      .orderBy('score', 'DESC')
      .addOrderBy('product.createdAt', 'DESC')
      .take(this.safeLimit(limit))
      .getMany();
  }

  async similar(productId: string, limit = 8): Promise<Product[]> {
    const product = await this.productsRepository.findOne({
      where: { id: productId, isActive: true },
      relations: ['category'],
    });

    if (!product) return this.trending(limit);

    const tags = product.tags ?? [];
    const tagScore =
      tags.length > 0 ? '+ CASE WHEN product.tags && :tags THEN 20 ELSE 0 END' : '+ 0';
    const qb = this.baseProductQuery()
      .where('product.id != :productId', { productId })
      .andWhere('product.isActive = :isActive', { isActive: true })
      .addSelect(
        `(
          CASE WHEN product.category_id = :categoryId THEN 50 ELSE 0 END
          + CASE WHEN product.brand IS NOT NULL AND LOWER(product.brand) = LOWER(:brand) THEN 25 ELSE 0 END
          ${tagScore}
          + product.purchase_count * 4
          + product.cart_add_count * 2
          + product.view_count
        )`,
        'score',
      )
      .setParameters({
        categoryId: product.categoryId,
        brand: product.brand ?? '',
        tags,
      })
      .orderBy('score', 'DESC')
      .addOrderBy('product.createdAt', 'DESC')
      .take(this.safeLimit(limit));

    const results = await qb.getMany();
    return results.length > 0 ? results : this.trending(limit);
  }

  async forVisitor(
    user: User | null,
    sessionId?: string,
    limit = 10,
  ): Promise<Product[]> {
    const events = await this.findRecentBehavior(user, sessionId);
    const productIds = Array.from(
      new Set(events.map((event) => event.productId).filter(Boolean) as string[]),
    );

    if (productIds.length === 0) return this.trending(limit);

    const viewedProducts = await this.productsRepository.find({
      where: { id: In(productIds) },
    });
    const categoryIds = Array.from(
      new Set(viewedProducts.map((product) => product.categoryId).filter(Boolean)),
    );
    const brands = Array.from(
      new Set(viewedProducts.map((product) => product.brand).filter(Boolean)),
    );
    const tags = Array.from(
      new Set(viewedProducts.flatMap((product) => product.tags ?? [])),
    );
    const tagScore =
      tags.length > 0 ? '+ CASE WHEN product.tags && :tags THEN 20 ELSE 0 END' : '+ 0';

    const qb = this.baseProductQuery()
      .where('product.id NOT IN (:...productIds)', { productIds })
      .andWhere('product.isActive = :isActive', { isActive: true })
      .addSelect(
        `(
          CASE WHEN product.category_id IN (:...categoryIds) THEN 45 ELSE 0 END
          + CASE WHEN product.brand IN (:...brands) THEN 25 ELSE 0 END
          ${tagScore}
          + product.purchase_count * 5
          + product.favorite_count * 3
          + product.cart_add_count * 2
          + product.view_count
        )`,
        'score',
      )
      .setParameters({
        categoryIds: categoryIds.length > 0 ? categoryIds : ['00000000-0000-4000-8000-000000000000'],
        brands: brands.length > 0 ? brands : ['__none__'],
        tags,
      })
      .orderBy('score', 'DESC')
      .addOrderBy('product.createdAt', 'DESC')
      .take(this.safeLimit(limit));

    const results = await qb.getMany();
    return results.length > 0 ? results : this.trending(limit);
  }

  private async findRecentBehavior(
    user: User | null,
    sessionId?: string,
  ): Promise<UserEvent[]> {
    const qb = this.eventsRepository
      .createQueryBuilder('event')
      .where('event.productId IS NOT NULL')
      .orderBy('event.createdAt', 'DESC')
      .take(30);

    if (user?.id) {
      qb.andWhere('event.userId = :userId', { userId: user.id });
    } else if (sessionId) {
      qb.andWhere('event.sessionId = :sessionId', { sessionId });
    } else {
      return [];
    }

    return qb.getMany();
  }

  private baseProductQuery() {
    return this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.vendor', 'vendor')
      .leftJoinAndSelect('product.images', 'images')
      .where('product.isActive = :isActive', { isActive: true })
      .andWhere('product.deleted_at IS NULL')
      .addOrderBy('images.sortOrder', 'ASC');
  }

  private safeLimit(limit: number): number {
    return Math.min(Math.max(Number(limit) || 10, 1), 30);
  }
}
