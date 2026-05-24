import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Shipment } from './entities/shipment.entity';
import { ShipmentEvent } from './entities/shipment-event.entity';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import {
  ALLOWED_SHIPMENT_STATUS_TRANSITIONS,
  ShipmentStatus,
} from '../common/enums/shipment-status.enum';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';
import { OrderStatus } from '../common/enums/order-status.enum';
import { PaymentMethod, PaymentStatus } from '../common/enums/payment.enum';

const SHIPPABLE_ORDER_STATUSES = [
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
];

@Injectable()
export class ShipmentsService {
  constructor(
    @InjectRepository(Shipment)
    private readonly shipmentsRepository: Repository<Shipment>,

    @InjectRepository(ShipmentEvent)
    private readonly shipmentEventsRepository: Repository<ShipmentEvent>,

    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,

    private readonly dataSource: DataSource,
  ) {}

  async createForOrder(
    orderId: string,
    dto: CreateShipmentDto,
  ): Promise<Shipment> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException('الطلب غير موجود');
      }

      if (!SHIPPABLE_ORDER_STATUSES.includes(order.status)) {
        throw new BadRequestException(
          `لا يمكن إنشاء شحنة لطلب في حالة ${order.status}. يجب تجهيز الطلب أولاً`,
        );
      }

      const existingForOrder = await manager.findOne(Shipment, {
        where: { orderId: order.id },
      });
      if (existingForOrder) {
        throw new BadRequestException('هذا الطلب لديه شحنة بالفعل');
      }

      const existingTracking = await manager.findOne(Shipment, {
        where: { trackingNumber: dto.trackingNumber },
      });
      if (existingTracking) {
        throw new BadRequestException('رقم التتبع مستخدم في شحنة أخرى');
      }

      const shipment = manager.create(Shipment, {
        orderId: order.id,
        customerId: order.customerId,
        carrierName: dto.carrierName,
        trackingNumber: dto.trackingNumber,
        status: ShipmentStatus.READY_TO_SHIP,
        origin: dto.origin,
        destination: dto.destination,
        estimatedDeliveryAt: dto.estimatedDeliveryAt
          ? new Date(dto.estimatedDeliveryAt)
          : null,
      });

      const savedShipment = await manager.save(Shipment, shipment);
      await this.createEvent(manager, savedShipment.id, {
        status: ShipmentStatus.READY_TO_SHIP,
        location: dto.origin,
        message: 'Shipment created and ready to ship',
      });

      await manager.update(Order, order.id, {
        shippingCarrier: dto.carrierName,
        trackingNumber: dto.trackingNumber,
      });

      return this.findOneWithManager(manager, savedShipment.id);
    });
  }

  async findMyShipments(user: User): Promise<Shipment[]> {
    if (user.role === Role.ADMIN) {
      return this.shipmentsRepository.find({
        relations: ['order', 'events'],
        order: { createdAt: 'DESC', events: { occurredAt: 'DESC' } },
      });
    }

    return this.shipmentsRepository.find({
      where: { customerId: user.id },
      relations: ['order', 'events'],
      order: { createdAt: 'DESC', events: { occurredAt: 'DESC' } },
    });
  }

  async findOne(id: string, user: User): Promise<Shipment> {
    const shipment = await this.shipmentsRepository.findOne({
      where: { id },
      relations: ['order', 'events'],
      order: { events: { occurredAt: 'DESC' } },
    });

    if (!shipment) {
      throw new NotFoundException('الشحنة غير موجودة');
    }

    this.assertCanAccessShipment(shipment, user);
    return shipment;
  }

  async findByOrder(orderId: string, user: User): Promise<Shipment> {
    const order = await this.ordersRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('الطلب غير موجود');
    }

    if (user.role !== Role.ADMIN && order.customerId !== user.id) {
      throw new ForbiddenException('ليس لديك صلاحية للوصول إلى شحنة هذا الطلب');
    }

    const shipment = await this.shipmentsRepository.findOne({
      where: { orderId },
      relations: ['order', 'events'],
      order: { events: { occurredAt: 'DESC' } },
    });

    if (!shipment) {
      throw new NotFoundException('لا توجد شحنة لهذا الطلب بعد');
    }

    return shipment;
  }

  async updateStatus(
    shipmentId: string,
    dto: UpdateShipmentStatusDto,
  ): Promise<Shipment> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const shipment = await manager.findOne(Shipment, {
        where: { id: shipmentId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!shipment) {
        throw new NotFoundException('الشحنة غير موجودة');
      }

      const allowedNextStatuses =
        ALLOWED_SHIPMENT_STATUS_TRANSITIONS[shipment.status];

      if (!allowedNextStatuses.includes(dto.status)) {
        throw new UnprocessableEntityException(
          `لا يمكن نقل الشحنة من ${shipment.status} إلى ${dto.status}`,
        );
      }

      const now = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
      await manager.update(Shipment, shipment.id, {
        status: dto.status,
        ...this.getShipmentTimestamps(dto.status, now),
      });

      await this.createEvent(manager, shipment.id, {
        status: dto.status,
        location: dto.location,
        message: dto.message,
        occurredAt: now,
      });

      await this.syncOrderFromShipmentStatus(manager, shipment, dto.status, now);

      return this.findOneWithManager(manager, shipment.id);
    });
  }

  private async syncOrderFromShipmentStatus(
    manager: EntityManager,
    shipment: Shipment,
    status: ShipmentStatus,
    occurredAt: Date,
  ): Promise<void> {
    const order = await manager.findOne(Order, {
      where: { id: shipment.orderId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!order) {
      throw new NotFoundException('الطلب المرتبط بالشحنة غير موجود');
    }

    if (
      [
        ShipmentStatus.SHIPPED,
        ShipmentStatus.IN_TRANSIT,
        ShipmentStatus.OUT_FOR_DELIVERY,
      ].includes(status) &&
      [OrderStatus.CONFIRMED, OrderStatus.PROCESSING].includes(order.status)
    ) {
      await manager.update(Order, order.id, {
        status: OrderStatus.SHIPPED,
        shippingCarrier: shipment.carrierName,
        trackingNumber: shipment.trackingNumber,
        shippedAt: order.shippedAt ?? occurredAt,
      });
    }

    if (status === ShipmentStatus.DELIVERED) {
      await manager.update(Order, order.id, {
        status: OrderStatus.DELIVERED,
        deliveredAt: occurredAt,
        ...(order.paymentMethod === PaymentMethod.CASH_ON_DELIVERY
          ? { paymentStatus: PaymentStatus.PAID }
          : {}),
      });
    }
  }

  private getShipmentTimestamps(
    status: ShipmentStatus,
    occurredAt: Date,
  ): Partial<Shipment> {
    if (
      [
        ShipmentStatus.SHIPPED,
        ShipmentStatus.IN_TRANSIT,
        ShipmentStatus.OUT_FOR_DELIVERY,
      ].includes(status)
    ) {
      return { shippedAt: occurredAt };
    }

    if (status === ShipmentStatus.DELIVERED) {
      return { deliveredAt: occurredAt };
    }

    return {};
  }

  private async createEvent(
    manager: EntityManager,
    shipmentId: string,
    data: {
      status: ShipmentStatus;
      location?: string;
      message?: string;
      occurredAt?: Date;
    },
  ): Promise<ShipmentEvent> {
    const event = manager.create(ShipmentEvent, {
      shipmentId,
      status: data.status,
      location: data.location,
      message: data.message,
      occurredAt: data.occurredAt ?? new Date(),
    });

    return manager.save(ShipmentEvent, event);
  }

  private async findOneWithManager(
    manager: EntityManager,
    id: string,
  ): Promise<Shipment> {
    return manager.findOne(Shipment, {
      where: { id },
      relations: ['order', 'events'],
      order: { events: { occurredAt: 'DESC' } },
    });
  }

  private assertCanAccessShipment(shipment: Shipment, user: User): void {
    if (user.role === Role.ADMIN) return;

    if (shipment.customerId !== user.id) {
      throw new ForbiddenException('ليس لديك صلاحية للوصول إلى هذه الشحنة');
    }
  }
}
