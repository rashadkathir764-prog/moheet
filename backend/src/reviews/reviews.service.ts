import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ProductReview,
  ReviewStatus,
} from './entities/product-review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewStatusDto } from './dto/update-review-status.dto';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { OrderStatus } from '../common/enums/order-status.enum';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ProductReview)
    private readonly reviewsRepository: Repository<ProductReview>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async create(user: User, dto: CreateReviewDto): Promise<ProductReview> {
    const product = await this.productsRepository.findOne({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const order = await this.ordersRepository.findOne({
      where: { id: dto.orderId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== user.id) {
      throw new ForbiddenException('You can review only your own orders');
    }
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Product can be reviewed after delivery only');
    }

    const purchased = await this.orderItemsRepository.findOne({
      where: { orderId: dto.orderId, productId: dto.productId },
    });
    if (!purchased) {
      throw new BadRequestException('This product was not purchased in the selected order');
    }

    const duplicate = await this.reviewsRepository.findOne({
      where: { user: { id: user.id }, product: { id: dto.productId } },
    });
    if (duplicate) {
      throw new BadRequestException('You already reviewed this product');
    }

    const review = this.reviewsRepository.create({
      user,
      product,
      order,
      rating: dto.rating,
      title: dto.title,
      comment: dto.comment,
      isVerifiedPurchase: true,
      status: ReviewStatus.APPROVED,
    });
    const savedReview = await this.reviewsRepository.save(review);
    await this.refreshProductReviewStats(product.id);
    return savedReview;
  }

  async findByProduct(productId: string): Promise<ProductReview[]> {
    return this.reviewsRepository.find({
      where: { product: { id: productId }, status: ReviewStatus.APPROVED },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findMine(user: User): Promise<ProductReview[]> {
    return this.reviewsRepository.find({
      where: { user: { id: user.id } },
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(): Promise<ProductReview[]> {
    return this.reviewsRepository.find({
      relations: ['user', 'product', 'order'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateReviewStatusDto,
  ): Promise<ProductReview> {
    const review = await this.reviewsRepository.findOne({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    await this.reviewsRepository.update(id, { status: dto.status });
    const updatedReview = await this.reviewsRepository.findOne({
      where: { id },
      relations: ['user', 'product'],
    });

    if (updatedReview?.product?.id) {
      await this.refreshProductReviewStats(updatedReview.product.id);
    }

    return updatedReview;
  }

  private async refreshProductReviewStats(productId: string): Promise<void> {
    const result = await this.reviewsRepository
      .createQueryBuilder('review')
      .select('COUNT(review.id)', 'count')
      .addSelect('COALESCE(AVG(review.rating), 0)', 'average')
      .where('review.product_id = :productId', { productId })
      .andWhere('review.status = :status', { status: ReviewStatus.APPROVED })
      .getRawOne<{ count: string; average: string }>();

    await this.productsRepository.update(productId, {
      reviewCount: Number(result?.count ?? 0),
      ratingAverage: Number(Number(result?.average ?? 0).toFixed(2)),
    });
  }
}
