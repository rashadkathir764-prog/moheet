import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { Cart } from '../carts/entities/cart.entity';
import { CartItem } from '../carts/entities/cart-item.entity';
import { CreateOrderDto, ShippingAddressDto } from './dto/create-order.dto';
import { CheckoutOrderDto } from './dto/checkout-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';
import {
  OrderStatus,
  ALLOWED_STATUS_TRANSITIONS,
} from '../common/enums/order-status.enum';
import { PaymentStatus } from '../common/enums/payment.enum';
import { PaginatedResult } from '../products/products.service';
import { AddressesService } from '../addresses/addresses.service';
import { CouponsService } from '../coupons/coupons.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

// ─── ثابت رسوم الشحن (مبسَّط للـ MVP — يُحسَّن لاحقاً) ────────────────────
const FLAT_SHIPPING_FEE = 0; // مجاني في المرحلة الأولى

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,

    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,

    private readonly dataSource: DataSource,

    private readonly addressesService: AddressesService,
    private readonly couponsService: CouponsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // 🛒 إنشاء طلب جديد — العملية الأهم في المنظومة
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * تتم المعالجة الكاملة داخل Transaction واحدة:
   * 1. قفل سجلات المنتجات (Pessimistic Write Lock — FOR UPDATE)
   * 2. التحقق من توفر المخزون لكل منتج
   * 3. إنقاص المخزون
   * 4. حساب المبالغ
   * 5. إنشاء سجل الطلب
   * 6. إنشاء عناصر الطلب مع لقطات الأسعار
   * في حال فشل أي خطوة → Rollback تلقائي لكل العمليات
   */
  async create(dto: CreateOrderDto, customer: User): Promise<Order> {
    // التحقق من عدم تكرار المنتجات في نفس الطلب
    const productIds = dto.items.map((i) => i.productId);
    const uniqueIds = new Set(productIds);
    if (uniqueIds.size !== productIds.length) {
      throw new BadRequestException(
        'لا يمكن تكرار نفس المنتج في الطلب — دمج الكميات مطلوب',
      );
    }

    return this.dataSource.transaction(async (manager: EntityManager) => {
      // ── الخطوة 1: قفل المنتجات وفحص المخزون ─────────────────────────────
      const lockedProducts = await this.lockAndValidateProducts(
        manager,
        dto.items,
      );

      // ── الخطوة 2: إنقاص المخزون ──────────────────────────────────────────
      for (const { product, requestedQty } of lockedProducts) {
        await manager
          .createQueryBuilder()
          .update(Product)
          .set({ stockQuantity: () => `stock_quantity - ${requestedQty}` })
          .where('id = :id', { id: product.id })
          .execute();
      }

      // ── الخطوة 3: حساب المبالغ ───────────────────────────────────────────
      const subtotal = lockedProducts.reduce(
        (sum, { product, requestedQty }) =>
          sum + parseFloat(product.price as any) * requestedQty,
        0,
      );

      const totalAmount =
        Math.round((subtotal + FLAT_SHIPPING_FEE) * 100) / 100;

      // ── الخطوة 4: إنشاء الطلب ────────────────────────────────────────────
      const order = manager.create(Order, {
        customerId: customer.id,
        shippingAddress: {
          fullName: dto.shippingAddress.fullName,
          phone: dto.shippingAddress.phone,
          fullAddress: dto.shippingAddress.fullAddress,
          city: dto.shippingAddress.city,
          country: dto.shippingAddress.country || 'اليمن',
        },
        paymentMethod: dto.paymentMethod,
        notes: dto.notes,
        subtotal: Math.round(subtotal * 100) / 100,
        shippingFee: FLAT_SHIPPING_FEE,
        discountAmount: 0,
        totalAmount,
        status: OrderStatus.PENDING,
      });

      const savedOrder = await manager.save(Order, order);

      // ── الخطوة 5: إنشاء عناصر الطلب مع اللقطات ──────────────────────────
      const orderItems = lockedProducts.map(({ product, requestedQty }) =>
        manager.create(OrderItem, {
          orderId: savedOrder.id,
          productId: product.id,
          // ⭐ اللقطات — ثابتة إلى الأبد
          productName: product.name,
          productThumbnail: product.thumbnailUrl,
          vendorId: product.vendorId,
          priceAtPurchase: parseFloat(product.price as any),
          quantity: requestedQty,
          totalPrice:
            Math.round(parseFloat(product.price as any) * requestedQty * 100) /
            100,
        }),
      );

      await manager.save(OrderItem, orderItems);

      // ── الخطوة 6: إرجاع الطلب الكامل ────────────────────────────────────
      return this.findOne(savedOrder.id, customer);
    });
  }

  async checkoutFromCart(
    dto: CheckoutOrderDto,
    customer: User,
  ): Promise<Order> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const cart = await manager.findOne(Cart, {
        where: { userId: customer.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!cart) {
        throw new BadRequestException('السلة فارغة، أضف منتجات قبل إتمام الشراء');
      }

      const cartItems = await manager.find(CartItem, {
        where: { cartId: cart.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!cartItems.length) {
        throw new BadRequestException('السلة فارغة، أضف منتجات قبل إتمام الشراء');
      }

      const checkoutItems = cartItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));

      const shippingAddress = await this.resolveCheckoutShippingAddress(
        dto,
        customer,
        manager,
      );

      const lockedProducts = await this.lockAndValidateProducts(
        manager,
        checkoutItems,
      );

      for (const { product, requestedQty } of lockedProducts) {
        await manager
          .createQueryBuilder()
          .update(Product)
          .set({ stockQuantity: () => `stock_quantity - ${requestedQty}` })
          .where('id = :id', { id: product.id })
          .execute();
      }

      const subtotal = lockedProducts.reduce(
        (sum, { product, requestedQty }) =>
          sum + parseFloat(product.price as any) * requestedQty,
        0,
      );
      const roundedSubtotal = Math.round(subtotal * 100) / 100;
      const couponResult = dto.couponCode
        ? await this.couponsService.calculateDiscount(
            dto.couponCode,
            roundedSubtotal,
            customer.id,
            manager,
          )
        : null;
      const discountAmount = couponResult?.discountAmount ?? 0;
      const totalAmount =
        Math.round((roundedSubtotal + FLAT_SHIPPING_FEE - discountAmount) * 100) /
        100;

      const order = manager.create(Order, {
        customerId: customer.id,
        shippingAddress: {
          fullName: shippingAddress.fullName,
          phone: shippingAddress.phone,
          fullAddress: shippingAddress.fullAddress,
          city: shippingAddress.city,
          country: shippingAddress.country || 'Yemen',
        },
        paymentMethod: dto.paymentMethod,
        notes: dto.notes,
        subtotal: roundedSubtotal,
        shippingFee: FLAT_SHIPPING_FEE,
        discountAmount,
        couponCode: couponResult?.coupon.code,
        totalAmount,
        status: OrderStatus.PENDING,
      });

      const savedOrder = await manager.save(Order, order);
      if (couponResult) {
        await this.couponsService.redeem(
          couponResult.coupon,
          customer,
          savedOrder,
          discountAmount,
          manager,
        );
      }

      const orderItems = lockedProducts.map(({ product, requestedQty }) =>
        manager.create(OrderItem, {
          orderId: savedOrder.id,
          productId: product.id,
          productName: product.name,
          productThumbnail: product.thumbnailUrl,
          vendorId: product.vendorId,
          priceAtPurchase: parseFloat(product.price as any),
          quantity: requestedQty,
          totalPrice:
            Math.round(parseFloat(product.price as any) * requestedQty * 100) /
            100,
        }),
      );

      await manager.save(OrderItem, orderItems);
      await manager.delete(CartItem, { cartId: cart.id });
      await this.notificationsService.createForUser(
        {
          userId: customer.id,
          type: NotificationType.ORDER_CREATED,
          title: 'Order created',
          message: `Your order ${savedOrder.id} was created successfully`,
          data: { orderId: savedOrder.id, totalAmount },
        },
        manager,
      );

      return manager.findOne(Order, {
        where: { id: savedOrder.id },
        relations: ['customer', 'items', 'items.product'],
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 📋 جلب طلبات المستخدم الحالي (CUSTOMER)
  // ─────────────────────────────────────────────────────────────────────────
  private async resolveCheckoutShippingAddress(
    dto: CheckoutOrderDto,
    customer: User,
    manager: EntityManager,
  ): Promise<ShippingAddressDto> {
    if (dto.savedAddressId) {
      return this.addressesService.resolveShippingAddress(
        customer.id,
        dto.savedAddressId,
        manager,
      );
    }

    if (dto.shippingAddress) {
      return dto.shippingAddress;
    }

    throw new BadRequestException(
      'Shipping address or savedAddressId is required',
    );
  }

  async findMyOrders(
    customer: User,
    page = 1,
    limit = 10,
  ): Promise<PaginatedResult<Order>> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.ordersRepository.findAndCount({
      where: { customerId: customer.id },
      relations: ['items'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 📋 جلب جميع الطلبات (ADMIN فقط)
  // ─────────────────────────────────────────────────────────────────────────
  async findAll(query: QueryOrdersDto): Promise<PaginatedResult<Order>> {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const qb = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.items', 'items')
      .orderBy('order.createdAt', 'DESC');

    if (query.status) {
      qb.andWhere('order.status = :status', { status: query.status });
    }

    if (query.paymentStatus) {
      qb.andWhere('order.paymentStatus = :paymentStatus', {
        paymentStatus: query.paymentStatus,
      });
    }

    if (query.customerId) {
      qb.andWhere('order.customerId = :customerId', {
        customerId: query.customerId,
      });
    }

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 🔍 جلب طلب واحد بالمعرف (مع التحقق من الملكية)
  // ─────────────────────────────────────────────────────────────────────────
  async findOne(id: string, requestingUser: User): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: ['customer', 'items', 'items.product'],
    });

    if (!order) {
      throw new NotFoundException(`الطلب بالمعرف ${id} غير موجود`);
    }

    // CUSTOMER: يرى طلباته فقط
    if (
      requestingUser.role === Role.CUSTOMER &&
      order.customerId !== requestingUser.id
    ) {
      throw new ForbiddenException('ليس لديك صلاحية لعرض هذا الطلب');
    }

    return order;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 📦 عرض عناصر الطلبات للبائع (VENDOR)
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * البائع يرى فقط OrderItems المرتبطة بمنتجاته عبر vendor_id المُخزَّن في اللقطة
   * لا يرى منتجات التجار الآخرين في نفس الطلب — حماية تجارية ضرورية
   */
  async findVendorItems(
    vendor: User,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<OrderItem>> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.orderItemsRepository.findAndCount({
      where: { vendorId: vendor.id },
      relations: ['order', 'order.customer'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ✏️ تحديث حالة الطلب (ADMIN فقط)
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * يطبّق آلة الحالة (State Machine) — لا يسمح بالانتقال بين حالات غير منطقية
   * مثال: لا يمكن نقل طلب من DELIVERED إلى PROCESSING
   */
  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
  ): Promise<Order> {
    await this.dataSource.transaction(async (manager: EntityManager) => {
      const order = await manager.findOne(Order, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException(`الطلب بالمعرف ${id} غير موجود`);
      }

      // التحقق من صحة انتقال الحالة عبر State Machine
      const allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS[order.status];

      if (!allowedNextStatuses.includes(dto.status)) {
        throw new UnprocessableEntityException(
          `لا يمكن نقل الطلب من "${order.status}" إلى "${dto.status}". ` +
            `الحالات المسموحة: ${allowedNextStatuses.join(', ') || 'لا توجد'}`,
        );
      }

      if (
        dto.status === OrderStatus.SHIPPED &&
        (!dto.shippingCarrier || !dto.trackingNumber)
      ) {
        throw new BadRequestException(
          'شركة الشحن ورقم التتبع مطلوبان عند نقل الطلب إلى SHIPPED',
        );
      }

      if (dto.status === OrderStatus.CANCELLED) {
        const orderItems = await manager.find(OrderItem, {
          where: { orderId: id },
        });
        await this.restoreOrderItemsStock(manager, orderItems);
      }

      const updatePayload: Partial<Order> = {
        status: dto.status,
        ...(dto.paymentStatus && { paymentStatus: dto.paymentStatus }),
        ...(dto.adminNotes && { adminNotes: dto.adminNotes }),
        ...(dto.shippingCarrier && { shippingCarrier: dto.shippingCarrier }),
        ...(dto.trackingNumber && { trackingNumber: dto.trackingNumber }),
        ...this.getOrderStatusTimestamps(dto.status),
      };

      if (dto.status === OrderStatus.DELIVERED && !dto.paymentStatus) {
        updatePayload.paymentStatus = PaymentStatus.PAID;
      }

      if (dto.status === OrderStatus.REFUNDED && !dto.paymentStatus) {
        updatePayload.paymentStatus = PaymentStatus.REFUNDED;
      }

      await manager.update(Order, id, updatePayload);

      await this.notificationsService.createForUser(
        {
          userId: order.customerId,
          type: NotificationType.ORDER_STATUS_CHANGED,
          title: 'Order status updated',
          message: `Your order ${id} is now ${dto.status}`,
          data: { orderId: id, status: dto.status },
        },
        manager,
      );
    });

    const updatedOrder = await this.ordersRepository.findOne({
      where: { id },
      relations: ['customer', 'items'],
    });

    return updatedOrder;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ❌ إلغاء طلب (CUSTOMER: طلبه في PENDING فقط | ADMIN: أي طلب)
  // ─────────────────────────────────────────────────────────────────────────
  async cancelOrder(id: string, requestingUser: User): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException(`الطلب بالمعرف ${id} غير موجود`);
    }

    // CUSTOMER: يلغي طلبه فقط وفي PENDING فقط
    if (requestingUser.role === Role.CUSTOMER) {
      if (order.customerId !== requestingUser.id) {
        throw new ForbiddenException('ليس لديك صلاحية لإلغاء هذا الطلب');
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException(
          `لا يمكن إلغاء الطلب في مرحلة "${order.status}" — يمكن الإلغاء في مرحلة PENDING فقط`,
        );
      }
    }

    // التحقق من الانتقال عبر State Machine
    const allowed = ALLOWED_STATUS_TRANSITIONS[order.status];
    if (!allowed.includes(OrderStatus.CANCELLED)) {
      throw new UnprocessableEntityException(
        `لا يمكن إلغاء طلب في مرحلة "${order.status}"`,
      );
    }

    // ── استرجاع المخزون عند الإلغاء ────────────────────────────────────────
    await this.dataSource.transaction(async (manager: EntityManager) => {
      await this.restoreOrderItemsStock(manager, order.items);

      await manager.update(Order, id, {
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
      });

      await this.notificationsService.createForUser(
        {
          userId: order.customerId,
          type: NotificationType.ORDER_STATUS_CHANGED,
          title: 'Order cancelled',
          message: `Your order ${id} was cancelled`,
          data: { orderId: id, status: OrderStatus.CANCELLED },
        },
        manager,
      );
    });

    return this.ordersRepository.findOne({
      where: { id },
      relations: ['customer', 'items'],
    });
  }

  private getOrderStatusTimestamps(status: OrderStatus): Partial<Order> {
    const now = new Date();

    switch (status) {
      case OrderStatus.SHIPPED:
        return { shippedAt: now };
      case OrderStatus.DELIVERED:
        return { deliveredAt: now };
      case OrderStatus.CANCELLED:
        return { cancelledAt: now };
      case OrderStatus.REFUNDED:
        return { refundedAt: now };
      default:
        return {};
    }
  }

  private async restoreOrderItemsStock(
    manager: EntityManager,
    items: OrderItem[],
  ): Promise<void> {
    for (const item of items) {
      await manager
        .createQueryBuilder()
        .update(Product)
        .set({ stockQuantity: () => `stock_quantity + ${item.quantity}` })
        .where('id = :id', { id: item.productId })
        .execute();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 🔒 القفل التشاؤمي + التحقق من المخزون (الدالة الأهم تقنياً)
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * تنفيذ SELECT ... FOR UPDATE على كل منتج مطلوب
   *
   * هذا القفل يمنع Race Condition عند الشراء المتزامن:
   * إذا قام مستخدمان بشراء آخر قطعة في نفس الجزء من الثانية،
   * فإن PostgreSQL يُدخل طلباً واحداً فقط وينتظر الآخر — لا خسارة مخزون.
   */
  private async lockAndValidateProducts(
    manager: EntityManager,
    items: Array<{ productId: string; quantity: number }>,
  ): Promise<Array<{ product: Product; requestedQty: number }>> {
    const result: Array<{ product: Product; requestedQty: number }> = [];
    const errors: string[] = [];

    for (const item of items) {
      // ⚡ Pessimistic Write Lock — FOR UPDATE
      const product = await manager.findOne(Product, {
        where: { id: item.productId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!product) {
        errors.push(`المنتج بالمعرف ${item.productId} غير موجود`);
        continue;
      }

      if (!product.isActive || product.deletedAt) {
        errors.push(`المنتج "${product.name}" غير متاح للشراء حالياً`);
        continue;
      }

      if (product.stockQuantity < item.quantity) {
        errors.push(
          `المخزون غير كافٍ للمنتج "${product.name}". ` +
            `المتاح: ${product.stockQuantity} — المطلوب: ${item.quantity}`,
        );
        continue;
      }

      result.push({ product, requestedQty: item.quantity });
    }

    // إذا كان هناك أي خطأ → Rollback التلقائي (رفع استثناء داخل Transaction)
    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'فشل إنشاء الطلب — مشكلة في المخزون أو المنتجات',
        errors,
      });
    }

    return result;
  }
}
