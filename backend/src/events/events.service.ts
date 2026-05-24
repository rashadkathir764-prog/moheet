import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserEventDto } from './dto/create-user-event.dto';
import {
  UserEvent,
  UserEventSource,
  UserEventType,
} from './entities/user-event.entity';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { OrderItem } from '../orders/entities/order-item.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(UserEvent)
    private readonly eventsRepository: Repository<UserEvent>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,
  ) {}

  async create(dto: CreateUserEventDto, user?: User | null): Promise<UserEvent> {
    if (!user?.id && !dto.sessionId) {
      throw new BadRequestException('sessionId is required for guest events');
    }

    const event = this.eventsRepository.create({
      type: dto.type,
      source: dto.source ?? UserEventSource.WEB,
      userId: user?.id ?? null,
      sessionId: dto.sessionId ?? null,
      productId: dto.productId ?? null,
      categoryId: dto.categoryId ?? null,
      orderId: dto.orderId ?? null,
      searchQuery: dto.searchQuery?.trim() || null,
      metadata: dto.metadata ?? {},
    });

    const savedEvent = await this.eventsRepository.save(event);
    await this.updateProductSignals(savedEvent, dto.metadata);
    return savedEvent;
  }

  private async updateProductSignals(
    event: UserEvent,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    if (event.productId) {
      if (event.type === UserEventType.PRODUCT_VIEW) {
        await this.productsRepository.increment({ id: event.productId }, 'viewCount', 1);
      }

      if (event.type === UserEventType.ADD_TO_CART) {
        await this.productsRepository.increment(
          { id: event.productId },
          'cartAddCount',
          this.parsePositiveCount(metadata?.quantity),
        );
      }

      if (event.type === UserEventType.ADD_TO_FAVORITES) {
        await this.productsRepository.increment({ id: event.productId }, 'favoriteCount', 1);
      }
    }

    if (event.type === UserEventType.PURCHASE && event.orderId) {
      const items = await this.orderItemsRepository.find({
        where: { orderId: event.orderId },
      });

      await Promise.all(
        items.map((item) =>
          this.productsRepository.increment(
            { id: item.productId },
            'purchaseCount',
            this.parsePositiveCount(item.quantity),
          ),
        ),
      );
    }
  }

  private parsePositiveCount(value: unknown): number {
    const count = Number(value ?? 1);
    return Number.isFinite(count) && count > 0 ? Math.floor(count) : 1;
  }
}
