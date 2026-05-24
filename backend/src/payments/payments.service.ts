import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';
import { OrderStatus } from '../common/enums/order-status.enum';
import { PaymentMethod, PaymentStatus } from '../common/enums/payment.enum';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { SimulatePaymentDto } from './dto/simulate-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';

const PAYABLE_ORDER_STATUSES = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
];

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,

    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,

    private readonly dataSource: DataSource,
  ) {}

  async initiateForOrder(
    orderId: string,
    dto: InitiatePaymentDto,
    customer: User,
  ): Promise<Payment> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException('الطلب غير موجود');
      }

      this.assertCanAccessOrder(order, customer);
      this.assertOrderCanBePaid(order);

      const existingPending = await manager.findOne(Payment, {
        where: {
          orderId: order.id,
          customerId: customer.id,
          status: PaymentStatus.PENDING,
        },
      });

      if (existingPending) {
        return existingPending;
      }

      const method = dto.method ?? order.paymentMethod;
      const payment = manager.create(Payment, {
        orderId: order.id,
        customerId: customer.id,
        method,
        status: PaymentStatus.PENDING,
        amount: order.totalAmount,
        currency: (dto.currency ?? 'YER').toUpperCase(),
        provider: this.providerFor(method),
        metadata: {
          orderStatus: order.status,
          source: 'payments.initiateForOrder',
        },
      });

      return manager.save(Payment, payment);
    });
  }

  async findMyPayments(user: User): Promise<Payment[]> {
    if (user.role === Role.ADMIN) {
      return this.paymentsRepository.find({
        relations: ['order', 'customer'],
        order: { createdAt: 'DESC' },
      });
    }

    return this.paymentsRepository.find({
      where: { customerId: user.id },
      relations: ['order'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOrderPayments(orderId: string, user: User): Promise<Payment[]> {
    const order = await this.ordersRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('الطلب غير موجود');
    }

    this.assertCanAccessOrder(order, user);

    return this.paymentsRepository.find({
      where: { orderId },
      relations: ['order', 'customer'],
      order: { createdAt: 'DESC' },
    });
  }

  async simulate(paymentId: string, dto: SimulatePaymentDto): Promise<Payment> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      if (![PaymentStatus.PAID, PaymentStatus.FAILED].includes(dto.status)) {
        throw new BadRequestException('المحاكي يدعم PAID أو FAILED فقط');
      }

      const payment = await manager.findOne(Payment, {
        where: { id: paymentId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!payment) {
        throw new NotFoundException('عملية الدفع غير موجودة');
      }

      if (payment.status !== PaymentStatus.PENDING) {
        throw new BadRequestException('لا يمكن تحديث عملية دفع غير معلقة');
      }

      const order = await manager.findOne(Order, {
        where: { id: payment.orderId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException('الطلب المرتبط بعملية الدفع غير موجود');
      }

      this.assertOrderCanBePaid(order);

      const now = new Date();
      const providerReference =
        dto.providerReference ?? `sim_${payment.id.replace(/-/g, '').slice(0, 24)}`;

      if (dto.status === PaymentStatus.PAID) {
        await manager.update(Payment, payment.id, {
          status: PaymentStatus.PAID,
          providerReference,
          authorizedAt: now,
          capturedAt: now,
          failureReason: null,
        });
        await manager.update(Order, order.id, {
          paymentStatus: PaymentStatus.PAID,
        });
      } else {
        await manager.update(Payment, payment.id, {
          status: PaymentStatus.FAILED,
          providerReference,
          failedAt: now,
          failureReason: dto.failureReason ?? 'Payment failed in simulator',
        });
        await manager.update(Order, order.id, {
          paymentStatus: PaymentStatus.FAILED,
        });
      }

      return manager.findOne(Payment, {
        where: { id: payment.id },
        relations: ['order', 'customer'],
      });
    });
  }

  async refund(paymentId: string, dto: RefundPaymentDto): Promise<Payment> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const payment = await manager.findOne(Payment, {
        where: { id: paymentId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!payment) {
        throw new NotFoundException('عملية الدفع غير موجودة');
      }

      if (payment.status !== PaymentStatus.PAID) {
        throw new BadRequestException('لا يمكن استرجاع عملية دفع غير ناجحة');
      }

      const order = await manager.findOne(Order, {
        where: { id: payment.orderId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException('الطلب المرتبط بعملية الدفع غير موجود');
      }

      const now = new Date();
      await manager.update(Payment, payment.id, {
        status: PaymentStatus.REFUNDED,
        refundedAt: now,
        metadata: {
          ...(payment.metadata ?? {}),
          refundReason: dto.reason ?? null,
        },
      });

      await manager.update(Order, order.id, {
        paymentStatus: PaymentStatus.REFUNDED,
        ...(order.status === OrderStatus.DELIVERED ||
        order.status === OrderStatus.CANCELLED
          ? { status: OrderStatus.REFUNDED, refundedAt: now }
          : { refundedAt: now }),
      });

      return manager.findOne(Payment, {
        where: { id: payment.id },
        relations: ['order', 'customer'],
      });
    });
  }

  private providerFor(method: PaymentMethod): string {
    if (method === PaymentMethod.CASH_ON_DELIVERY) {
      return 'CASH_ON_DELIVERY';
    }

    return 'INTERNAL_SIMULATOR';
  }

  private assertCanAccessOrder(order: Order, user: User): void {
    if (user.role === Role.ADMIN) return;

    if (order.customerId !== user.id) {
      throw new ForbiddenException('ليس لديك صلاحية للوصول إلى مدفوعات هذا الطلب');
    }
  }

  private assertOrderCanBePaid(order: Order): void {
    if (!PAYABLE_ORDER_STATUSES.includes(order.status)) {
      throw new BadRequestException(
        `لا يمكن دفع طلب في حالة ${order.status}`,
      );
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('هذا الطلب مدفوع بالفعل');
    }

    if (order.paymentStatus === PaymentStatus.REFUNDED) {
      throw new BadRequestException('هذا الطلب مسترجع ولا يمكن دفعه مرة أخرى');
    }
  }
}
