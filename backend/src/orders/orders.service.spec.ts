import {
  BadRequestException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderStatus } from '../common/enums/order-status.enum';
import { PaymentStatus } from '../common/enums/payment.enum';
import { Role } from '../common/enums/role.enum';

describe('OrdersService permissions and lifecycle', () => {
  const makeService = (
    overrides: {
      order?: Record<string, unknown> | null;
      updatedOrder?: Record<string, unknown> | null;
      manager?: Record<string, jest.Mock>;
    } = {},
  ) => {
    const order = overrides.order ?? {
      id: 'order-1',
      customerId: 'customer-1',
      status: OrderStatus.PENDING,
    };

    const updatedOrder = overrides.updatedOrder ?? order;

    const ordersRepository = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(order)
        .mockResolvedValue(updatedOrder),
      findAndCount: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const queryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const manager = {
      create: jest.fn((_entity, payload) => payload),
      findOne: jest.fn().mockResolvedValue(order),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(async (entity, payload) =>
        entity?.name === 'Order' ? { ...payload, id: 'created-order-1' } : payload,
      ),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(() => queryBuilder),
      ...(overrides.manager ?? {}),
    };

    const dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    };

    const notificationsService = {
      createForUser: jest.fn().mockResolvedValue(undefined),
    };

    const service = new OrdersService(
      ordersRepository as any,
      { findAndCount: jest.fn() } as any,
      dataSource as any,
      {} as any,
      {} as any,
      notificationsService as any,
    );

    return { service, ordersRepository, manager, dataSource, queryBuilder };
  };

  it('rejects a vendor trying to read a full order they do not own', async () => {
    const { service } = makeService();

    await expect(
      service.findOne('order-1', {
        id: 'vendor-1',
        role: Role.VENDOR,
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a vendor from full order details even if ids match', async () => {
    const { service } = makeService({
      order: {
        id: 'order-1',
        customerId: 'vendor-1',
        status: OrderStatus.PENDING,
      },
    });

    await expect(
      service.findOne('order-1', {
        id: 'vendor-1',
        role: Role.VENDOR,
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a customer trying to read another customer order', async () => {
    const { service } = makeService();

    await expect(
      service.findOne('order-1', {
        id: 'customer-2',
        role: Role.CUSTOMER,
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows a customer to read their own order', async () => {
    const { service } = makeService();

    await expect(
      service.findOne('order-1', {
        id: 'customer-1',
        role: Role.CUSTOMER,
      } as any),
    ).resolves.toMatchObject({
      id: 'order-1',
      customerId: 'customer-1',
    });
  });

  it('allows an admin to read any order', async () => {
    const { service } = makeService();

    await expect(
      service.findOne('order-1', {
        id: 'admin-1',
        role: Role.ADMIN,
      } as any),
    ).resolves.toMatchObject({
      id: 'order-1',
      customerId: 'customer-1',
    });
  });

  it('loads admin order details with items, history, payments, and shipments', async () => {
    const { service, ordersRepository } = makeService();

    await service.findOne('order-1', {
      id: 'admin-1',
      role: Role.ADMIN,
    } as any);

    expect(ordersRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-1' },
        relations: expect.arrayContaining([
          'customer',
          'items',
          'items.product',
          'statusHistory',
          'payments',
          'shipments',
          'shipments.events',
        ]),
      }),
    );
  });

  it('rejects status transition from CANCELLED to DELIVERED', async () => {
    const { service } = makeService({
      order: {
        id: 'order-1',
        customerId: 'customer-1',
        status: OrderStatus.CANCELLED,
      },
    });

    await expect(
      service.updateStatus('order-1', {
        status: OrderStatus.DELIVERED,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects status transition from DELIVERED to PENDING', async () => {
    const { service } = makeService({
      order: {
        id: 'order-1',
        customerId: 'customer-1',
        status: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.PAID,
      },
    });

    await expect(
      service.updateStatus('order-1', {
        status: OrderStatus.PENDING,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('creates status history when an admin performs a valid status transition', async () => {
    const { service, manager } = makeService({
      updatedOrder: {
        id: 'order-1',
        customerId: 'customer-1',
        status: OrderStatus.CONFIRMED,
        statusHistory: [],
      },
    });

    await service.updateStatus(
      'order-1',
      {
        status: OrderStatus.CONFIRMED,
        note: 'Confirmed by operations',
      },
      {
        id: 'admin-1',
        role: Role.ADMIN,
      } as any,
    );

    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'OrderStatusHistory' }),
      expect.objectContaining({
        orderId: 'order-1',
        fromStatus: OrderStatus.PENDING,
        toStatus: OrderStatus.CONFIRMED,
        changedByUserId: 'admin-1',
        changedByRole: Role.ADMIN,
        note: 'Confirmed by operations',
      }),
    );
  });

  it('does not create status history when a transition is rejected', async () => {
    const { service, manager } = makeService({
      order: {
        id: 'order-1',
        customerId: 'customer-1',
        status: OrderStatus.CANCELLED,
      },
    });

    await expect(
      service.updateStatus('order-1', {
        status: OrderStatus.DELIVERED,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    expect(manager.save).not.toHaveBeenCalled();
  });

  it('creates initial status history when a direct order is created', async () => {
    const { service, manager } = makeService({
      updatedOrder: {
        id: 'created-order-1',
        customerId: 'customer-1',
        status: OrderStatus.PENDING,
      },
    });
    (service as any).lockAndValidateProducts = jest.fn().mockResolvedValue([
      {
        product: {
          id: 'product-1',
          name: 'Sample Product',
          thumbnailUrl: null,
          vendorId: 'vendor-1',
          price: 10,
        },
        requestedQty: 2,
      },
    ]);

    await service.create(
      {
        items: [{ productId: 'product-1', quantity: 2 }],
        shippingAddress: {
          fullName: 'Customer',
          phone: '777777777',
          fullAddress: 'Address',
          city: 'Sanaa',
        },
        paymentMethod: 'CASH_ON_DELIVERY' as any,
      },
      {
        id: 'customer-1',
        role: Role.CUSTOMER,
      } as any,
    );

    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'OrderStatusHistory' }),
      expect.objectContaining({
        orderId: 'created-order-1',
        fromStatus: null,
        toStatus: OrderStatus.PENDING,
        changedByUserId: 'customer-1',
        changedByRole: Role.CUSTOMER,
        note: 'Order created',
      }),
    );
  });

  it('still requires carrier and tracking number before moving to SHIPPED', async () => {
    const { service } = makeService({
      order: {
        id: 'order-1',
        customerId: 'customer-1',
        status: OrderStatus.PROCESSING,
      },
    });

    await expect(
      service.updateStatus('order-1', {
        status: OrderStatus.SHIPPED,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('still restores stock when an order is cancelled through status update', async () => {
    const { service, manager, queryBuilder } = makeService({
      manager: {
        find: jest
          .fn()
          .mockResolvedValue([{ productId: 'product-1', quantity: 2 }]),
      },
    });

    await service.updateStatus('order-1', {
      status: OrderStatus.CANCELLED,
    });

    expect(manager.find).toHaveBeenCalled();
    expect(queryBuilder.execute).toHaveBeenCalled();
    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'OrderStatusHistory' }),
      expect.objectContaining({
        fromStatus: OrderStatus.PENDING,
        toStatus: OrderStatus.CANCELLED,
      }),
    );
  });
});
