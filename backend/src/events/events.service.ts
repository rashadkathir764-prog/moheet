import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
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

type AnalyticsRange = 'today' | '7d' | '30d' | 'all';

type AnalyticsEventCountKey =
  | AnalyticsMetricKey
  | UserEventType.UPDATE_CART
  | UserEventType.REMOVE_FROM_CART
  | UserEventType.REMOVE_FROM_FAVORITES
  | UserEventType.RECOMMENDATION_IMPRESSION
  | UserEventType.RECOMMENDATION_CLICK;

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

interface RecommendationAnalytics {
  impressions: number;
  clicks: number;
  ctr: number;
}

interface AnalyticsDataQuality {
  totalEventsInRange: number;
  eventsWithoutProductId: number;
  emptySearchQueries: number;
}

interface AnalyticsRangeFilter {
  range: AnalyticsRange;
  startDate?: Date;
}

export interface AnalyticsSummary {
  range: AnalyticsRange;
  productSignalsScope: 'allTime';
  totals: Record<AnalyticsMetricKey, number>;
  eventCounts: Record<AnalyticsEventCountKey, number>;
  recommendationMetrics: RecommendationAnalytics;
  dataQuality: AnalyticsDataQuality;
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

const EVENT_COUNT_TYPES: AnalyticsEventCountKey[] = [
  ...ANALYTICS_EVENTS,
  UserEventType.UPDATE_CART,
  UserEventType.REMOVE_FROM_CART,
  UserEventType.REMOVE_FROM_FAVORITES,
  UserEventType.RECOMMENDATION_IMPRESSION,
  UserEventType.RECOMMENDATION_CLICK,
];

const FUNNEL_LABELS: Record<AnalyticsMetricKey, string> = {
  [UserEventType.PRODUCT_VIEW]: 'مشاهدة المنتج',
  [UserEventType.ADD_TO_CART]: 'إضافة للسلة',
  [UserEventType.CHECKOUT_STARTED]: 'بدء الدفع',
  [UserEventType.PURCHASE]: 'شراء',
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

  async getAdminAnalyticsSummary(range?: string): Promise<AnalyticsSummary> {
    const rangeFilter = this.resolveRange(range);
    const [
      eventCounts,
      topViewedProducts,
      topCartProducts,
      topPurchasedProducts,
      topSearches,
      dataQuality,
    ] =
      await Promise.all([
        this.getEventCounts(rangeFilter),
        this.getTopProductsBySignal('viewCount'),
        this.getTopProductsBySignal('cartAddCount'),
        this.getTopProductsBySignal('purchaseCount'),
        this.getTopSearches(rangeFilter),
        this.getDataQuality(rangeFilter),
      ]);
    const eventTotals = this.pickFunnelTotals(eventCounts);

    return {
      range: rangeFilter.range,
      productSignalsScope: 'allTime',
      totals: eventTotals,
      eventCounts,
      recommendationMetrics: {
        impressions: eventCounts[UserEventType.RECOMMENDATION_IMPRESSION],
        clicks: eventCounts[UserEventType.RECOMMENDATION_CLICK],
        ctr: this.percentage(
          eventCounts[UserEventType.RECOMMENDATION_CLICK],
          eventCounts[UserEventType.RECOMMENDATION_IMPRESSION],
        ),
      },
      dataQuality,
      topViewedProducts,
      topCartProducts,
      topPurchasedProducts,
      topSearches,
      funnel: this.buildFunnel(eventTotals),
    };
  }

  private async getEventCounts(
    rangeFilter: AnalyticsRangeFilter,
  ): Promise<Record<AnalyticsEventCountKey, number>> {
    const qb = this.eventsRepository
      .createQueryBuilder('event')
      .select('event.type', 'type')
      .addSelect('COUNT(event.id)', 'count')
      .where('event.type IN (:...types)', { types: EVENT_COUNT_TYPES })
      .groupBy('event.type');

    const rows = await this.applyEventRange(qb, rangeFilter)
      .getRawMany<{ type: AnalyticsEventCountKey; count: string }>();

    const eventCounts = EVENT_COUNT_TYPES.reduce(
      (acc, type) => {
        acc[type] = 0;
        return acc;
      },
      {} as Record<AnalyticsEventCountKey, number>,
    );

    rows.forEach((row) => {
      eventCounts[row.type] = Number(row.count) || 0;
    });

    return eventCounts;
  }

  private pickFunnelTotals(
    eventCounts: Record<AnalyticsEventCountKey, number>,
  ): Record<AnalyticsMetricKey, number> {
    const totals = {} as Record<AnalyticsMetricKey, number>;
    ANALYTICS_EVENTS.forEach((event) => {
      totals[event] = eventCounts[event];
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

  private async getTopSearches(
    rangeFilter: AnalyticsRangeFilter,
  ): Promise<SearchAnalyticsItem[]> {
    const qb = this.eventsRepository
      .createQueryBuilder('event')
      .select('LOWER(TRIM(event.search_query))', 'query')
      .addSelect('COUNT(event.id)', 'count')
      .where('event.type = :type', { type: UserEventType.SEARCH })
      .andWhere('event.search_query IS NOT NULL')
      .andWhere("TRIM(event.search_query) != ''")
      .groupBy('LOWER(TRIM(event.search_query))')
      .orderBy('COUNT(event.id)', 'DESC')
      .limit(10);

    const rows = await this.applyEventRange(qb, rangeFilter)
      .getRawMany<{ query: string; count: string }>();

    return rows.map((row) => ({
      query: row.query,
      count: Number(row.count) || 0,
    }));
  }

  private async getDataQuality(
    rangeFilter: AnalyticsRangeFilter,
  ): Promise<AnalyticsDataQuality> {
    const expectedProductIdEvents = [
      UserEventType.PRODUCT_VIEW,
      UserEventType.ADD_TO_CART,
      UserEventType.PURCHASE,
      UserEventType.RECOMMENDATION_CLICK,
    ];

    const totalEventsQb = this.eventsRepository
      .createQueryBuilder('event');
    const missingProductQb = this.eventsRepository
      .createQueryBuilder('event')
      .where('event.type IN (:...types)', { types: expectedProductIdEvents })
      .andWhere('event.productId IS NULL');
    const emptySearchQb = this.eventsRepository
      .createQueryBuilder('event')
      .where('event.type = :type', { type: UserEventType.SEARCH })
      .andWhere("(event.search_query IS NULL OR TRIM(event.search_query) = '')");

    const [totalEventsInRange, eventsWithoutProductId, emptySearchQueries] =
      await Promise.all([
        this.applyEventRange(totalEventsQb, rangeFilter).getCount(),
        this.applyEventRange(missingProductQb, rangeFilter).getCount(),
        this.applyEventRange(emptySearchQb, rangeFilter).getCount(),
      ]);

    return {
      totalEventsInRange,
      eventsWithoutProductId,
      emptySearchQueries,
    };
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

  private resolveRange(range?: string): AnalyticsRangeFilter {
    const normalized = ['today', '7d', '30d', 'all'].includes(range ?? '')
      ? (range as AnalyticsRange)
      : '7d';

    if (normalized === 'all') {
      return { range: normalized };
    }

    const startDate = new Date();
    if (normalized === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else {
      const days = normalized === '30d' ? 30 : 7;
      startDate.setDate(startDate.getDate() - days);
    }

    return { range: normalized, startDate };
  }

  private applyEventRange(
    qb: SelectQueryBuilder<UserEvent>,
    rangeFilter: AnalyticsRangeFilter,
  ): SelectQueryBuilder<UserEvent> {
    if (rangeFilter.startDate) {
      qb.andWhere('event.createdAt >= :startDate', {
        startDate: rangeFilter.startDate,
      });
    }

    return qb;
  }
}
