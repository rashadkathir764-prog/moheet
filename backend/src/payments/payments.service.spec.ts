import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { Order } from '../orders/entities/order.entity';
import { PaymentStatus } from '../common/enums/payment.enum';
import { SimulatePaymentDto } from './dto/simulate-payment.dto';

/**
 * Focused spec for the production safety gate on simulate().
 *
 * The gate is the first statement of PaymentsService.simulate() and must
 * short-circuit before any transactional work is attempted in production.
 * Outside production (development, test, undefined) the call must proceed
 * past the gate into the dataSource transaction.
 */
describe('PaymentsService simulate() environment guard', () => {
  const buildService = (nodeEnv: string | undefined) => {
    const configService = {
      get: jest.fn((key: string) =>
        key === 'NODE_ENV' ? nodeEnv : undefined,
      ),
    } as unknown as ConfigService;

    // Sentinel error: if the guard lets the call through, the next thing
    // simulate() touches is dataSource.transaction. Rejecting it with a
    // unique error lets the test prove "guard passed" without simulating
    // the full transaction logic.
    const transactionReachedError = new Error('TX_REACHED');
    const dataSource = {
      transaction: jest.fn().mockRejectedValue(transactionReachedError),
    } as unknown as DataSource;

    const paymentsRepository = {} as unknown as Repository<Payment>;
    const ordersRepository = {} as unknown as Repository<Order>;

    const service = new PaymentsService(
      paymentsRepository,
      ordersRepository,
      dataSource,
      configService,
    );

    return { service, dataSource, transactionReachedError };
  };

  const validDto: SimulatePaymentDto = {
    status: PaymentStatus.PAID,
  };

  it('throws ForbiddenException when NODE_ENV is production', async () => {
    const { service, dataSource } = buildService('production');

    await expect(
      service.simulate('payment-1', validDto),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('uses the exact "Payment simulation is disabled in production" message', async () => {
    const { service } = buildService('production');

    await expect(
      service.simulate('payment-1', validDto),
    ).rejects.toHaveProperty(
      'message',
      'Payment simulation is disabled in production',
    );
  });

  it('passes the guard in development and reaches the transaction layer', async () => {
    const { service, dataSource, transactionReachedError } =
      buildService('development');

    await expect(
      service.simulate('payment-1', validDto),
    ).rejects.toBe(transactionReachedError);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('passes the guard in test environment', async () => {
    const { service, dataSource, transactionReachedError } =
      buildService('test');

    await expect(
      service.simulate('payment-1', validDto),
    ).rejects.toBe(transactionReachedError);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('passes the guard when NODE_ENV is undefined (defaults to non-production)', async () => {
    const { service, dataSource, transactionReachedError } =
      buildService(undefined);

    await expect(
      service.simulate('payment-1', validDto),
    ).rejects.toBe(transactionReachedError);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });
});
