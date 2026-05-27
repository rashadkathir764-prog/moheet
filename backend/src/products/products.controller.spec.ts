import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { ProductsController } from './products.controller';

describe('ProductsController visibility guards', () => {
  it('uses optional auth on the public product list', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      ProductsController.prototype.findAll,
    );

    expect(guards).toContain(OptionalJwtAuthGuard);
  });
});
