import {
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

    const manager = {
      findOne: jest.fn().mockResolvedValue(order),
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
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

    return { service, ordersRepository, manager, dataSource };
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
});
