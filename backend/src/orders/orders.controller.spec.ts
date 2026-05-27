import 'reflect-metadata';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { OrdersController } from './orders.controller';

describe('OrdersController permissions', () => {
  it('allows only customers to create direct orders', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      OrdersController.prototype.create,
    );

    expect(roles).toEqual([Role.CUSTOMER]);
  });

  it('allows only customers to checkout from cart', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      OrdersController.prototype.checkout,
    );

    expect(roles).toEqual([Role.CUSTOMER]);
  });

  it('keeps vendor order item access available for vendors and admins', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      OrdersController.prototype.findVendorItems,
    );

    expect(roles).toEqual([Role.VENDOR, Role.ADMIN]);
  });

  it('keeps admin order status management restricted to admins', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      OrdersController.prototype.updateStatus,
    );

    expect(roles).toEqual([Role.ADMIN]);
  });
});
