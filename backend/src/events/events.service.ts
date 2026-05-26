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

type AnalyticsMetricKey =
  | UserEventType.PRODUCT_VIEW
  | UserEventType.ADD_TO_CART
  | UserEventType.CHECKOUT_STARTED
  | UserEventType.PURCHASE;

interface ProductAnalyticsItem {
  productId: string;
  name: string;
  count: number;
}

interface SearchAnalyticsItem {
  query: string;
  count: number;
}

interface FunnelAnalyticsItem {
  event: AnalyticsMetricKey;
  label: string;
  count: number;
  rateFromViews: number;
  rateFromPrevious: number;
}

export interface AnalyticsSummary {
  totals: Record<AnalyticsMetricKey, number>;
  topViewedProducts: ProductAnalyticsItem[];
  topCartProducts: ProductAnalyticsItem[];
  topPurchasedProducts: ProductAnalyticsItem[];
  topSearches: SearchAnalyticsItem[];
  funnel: FunnelAnalyticsItem[];
}

const ANALYTICS_EVENTS: AnalyticsMetricKey[] = [
  UserEventType.PRODUCT_VIEW,
  UserEventType.ADD_TO_CART,
  UserEventType.CHECKOUT_STARTED,
  UserEventType.PURCHASE,
];

const FUNNEL_LABELS: Record<AnalyticsMetricKey, string> = {
  [UserEventType.PRODUCT_VIEW]: 'Product views',
  [UserEventType.ADD_TO_CART]: 'Add to cart',
  [UserEventType.CHECKOUT_STARTED]: 'Checkout started',
  [UserEventType.PURCHASE]: 'Purchases',
};

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

  async getAdminAnalyticsSummary(): Promise<AnalyticsSummary> {
    const [eventTotals, topViewedProducts, topCartProducts, topPurchasedProducts, topSearches] =
      await Promise.all([
        this.getEventTotals(),
        this.getTopProductsBySignal('viewCount'),
        this.getTopProductsBySignal('cartAddCount'),
        this.getTopProductsBySignal('purchaseCount'),
        this.getTopSearches(),
      ]);

    return {
      totals: eventTotals,
      topViewedProducts,
      topCartProducts,
      topPurchasedProducts,
      topSearches,
      funnel: this.buildFunnel(eventTotals),
    };
  }

  private async getEventTotals(): Promise<Record<AnalyticsMetricKey, number>> {
    const rows = await this.eventsRepository
      .createQueryBuilder('event')
      .select('event.type', 'type')
      .addSelect('COUNT(event.id)', 'count')
      .where('event.type IN (:...types)', { types: ANALYTICS_EVENTS })
      .groupBy('event.type')
      .getRawMany<{ type: AnalyticsMetricKey; count: string }>();

    const totals = ANALYTICS_EVENTS.reduce(
      (acc, type) => ({ ...acc, [type]: 0 }),
      {} as Record<AnalyticsMetricKey, number>,
    );

    rows.forEach((row) => {
      totals[row.type] = Number(row.count) || 0;
    });

    return totals;
  }

  private async getTopProductsBySignal(
    signal: 'viewCount' | 'cartAddCount' | 'purchaseCount',
  ): Promise<ProductAnalyticsItem[]> {
    const products = await this.productsRepository.find({
      select: {
        id: true,
        name: true,
        viewCount: true,
        cartAddCount: true,
        purchaseCount: true,
      },
      where: { isActive: true },
      order: { [signal]: 'DESC', createdAt: 'DESC' },
      take: 5,
    });

    return products
      .filter((product) => Number(product[signal] ?? 0) > 0)
      .map((product) => ({
        productId: product.id,
        name: product.name,
        count: Number(product[signal] ?? 0),
      }));
  }

  private async getTopSearches(): Promise<SearchAnalyticsItem[]> {
    const rows = await this.eventsRepository
      .createQueryBuilder('event')
      .select('LOWER(TRIM(event.search_query))', 'query')
      .addSelect('COUNT(event.id)', 'count')
      .where('event.type = :type', { type: UserEventType.SEARCH })
      .andWhere('event.search_query IS NOT NULL')
      .andWhere("TRIM(event.search_query) != ''")
      .groupBy('LOWER(TRIM(event.search_query))')
      .orderBy('COUNT(event.id)', 'DESC')
      .limit(10)
      .getRawMany<{ query: string; count: string }>();

    return rows.map((row) => ({
      query: row.query,
      count: Number(row.count) || 0,
    }));
  }

  private buildFunnel(
    totals: Record<AnalyticsMetricKey, number>,
  ): FunnelAnalyticsItem[] {
    const views = totals[UserEventType.PRODUCT_VIEW] || 0;

    return ANALYTICS_EVENTS.map((event, index) => {
      const count = totals[event] || 0;
      const previousEvent = ANALYTICS_EVENTS[index - 1];
      const previousCount = previousEvent ? totals[previousEvent] || 0 : count;

      return {
        event,
        label: FUNNEL_LABELS[event],
        count,
        rateFromViews: this.percentage(count, views),
        rateFromPrevious: index === 0 ? 100 : this.percentage(count, previousCount),
      };
    });
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

  private percentage(value: number, base: number): number {
    if (!base) return 0;
    return Math.round((value / base) * 1000) / 10;
  }
}
