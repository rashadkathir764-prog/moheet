import { BadRequestException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CartsService } from './carts.service';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';

describe('CartsService', () => {
  it('rejects cart quantities above the locked product stock', async () => {
    const cart = { id: 'cart-1', userId: 'customer-1' } as Cart;
    const product = {
      id: 'product-1',
      name: 'Limited product',
      stockQuantity: 1,
      isActive: true,
      deletedAt: null,
    } as Product;

    const cartsRepository = {
      findOne: jest.fn().mockResolvedValue(cart),
    } as unknown as Repository<Cart>;
    const cartItemsRepository = {} as Repository<CartItem>;
    const manager = {
      findOne: jest.fn((entity) => {
        if (entity === Product) {
          return Promise.resolve(product);
        }

        if (entity === CartItem) {
          return Promise.resolve(null);
        }

        return Promise.resolve(null);
      }),
      getRepository: jest.fn((entity) => {
        if (entity === Cart) {
          return cartsRepository;
        }

        return cartItemsRepository;
      }),
      save: jest.fn(),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: jest.fn((callback: (transactionManager: EntityManager) => unknown) =>
        callback(manager),
      ),
    } as unknown as DataSource;
    const service = new CartsService(
      cartsRepository,
      cartItemsRepository,
      dataSource,
    );

    await expect(
      service.addItem({ id: 'customer-1' } as User, {
        productId: product.id,
        quantity: 2,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.save).not.toHaveBeenCalled();
  });
});
