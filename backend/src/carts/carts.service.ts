import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartsService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartsRepository: Repository<Cart>,

    @InjectRepository(CartItem)
    private readonly cartItemsRepository: Repository<CartItem>,

    private readonly dataSource: DataSource,
  ) {}

  async getMyCart(customer: User): Promise<Cart> {
    const cart = await this.findOrCreateCart(customer.id);
    return this.findCartById(cart.id);
  }

  async addItem(customer: User, dto: AddCartItemDto): Promise<Cart> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const cart = await this.findOrCreateCart(customer.id, manager);
      const product = await this.lockAndValidateProduct(manager, dto.productId);

      const existingItem = await manager.findOne(CartItem, {
        where: { cartId: cart.id, productId: product.id },
        lock: { mode: 'pessimistic_write' },
      });

      const nextQuantity = (existingItem?.quantity ?? 0) + dto.quantity;
      this.ensureStock(product, nextQuantity);

      if (existingItem) {
        existingItem.quantity = nextQuantity;
        await manager.save(CartItem, existingItem);
      } else {
        const item = manager.create(CartItem, {
          cartId: cart.id,
          productId: product.id,
          quantity: dto.quantity,
        });
        await manager.save(CartItem, item);
      }

      return this.findCartById(cart.id, manager);
    });
  }

  async updateQuantity(
    customer: User,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<Cart> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const item = await this.findOwnedCartItem(customer.id, itemId, manager);
      const product = await this.lockAndValidateProduct(manager, item.productId);

      this.ensureStock(product, dto.quantity);

      item.quantity = dto.quantity;
      await manager.save(CartItem, item);

      return this.findCartById(item.cartId, manager);
    });
  }

  async removeItem(customer: User, itemId: string): Promise<Cart> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const item = await this.findOwnedCartItem(customer.id, itemId, manager);
      await manager.delete(CartItem, { id: item.id });

      return this.findCartById(item.cartId, manager);
    });
  }

  async clearCart(customer: User): Promise<Cart> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const cart = await this.findOrCreateCart(customer.id, manager);
      await manager.delete(CartItem, { cartId: cart.id });

      return this.findCartById(cart.id, manager);
    });
  }

  async clearCartByUserId(
    userId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const cart = await this.findOrCreateCart(userId, manager);
    const repo = manager
      ? manager.getRepository(CartItem)
      : this.cartItemsRepository;

    await repo.delete({ cartId: cart.id });
  }

  private async findOrCreateCart(
    userId: string,
    manager?: EntityManager,
  ): Promise<Cart> {
    const repo = manager ? manager.getRepository(Cart) : this.cartsRepository;

    const existingCart = await repo.findOne({ where: { userId } });
    if (existingCart) return existingCart;

    const cart = repo.create({ userId });
    return repo.save(cart);
  }

  private async findCartById(
    id: string,
    manager?: EntityManager,
  ): Promise<Cart> {
    const repo = manager ? manager.getRepository(Cart) : this.cartsRepository;
    const cart = await repo.findOne({
      where: { id },
      relations: ['items', 'items.product'],
      order: {
        items: {
          createdAt: 'ASC',
        },
      },
    });

    if (!cart) {
      throw new NotFoundException('السلة غير موجودة');
    }

    return cart;
  }

  private async findOwnedCartItem(
    userId: string,
    itemId: string,
    manager: EntityManager,
  ): Promise<CartItem> {
    const item = await manager
      .getRepository(CartItem)
      .createQueryBuilder('item')
      .innerJoinAndSelect('item.cart', 'cart', 'cart.user_id = :userId', {
        userId,
      })
      .where('item.id = :itemId', { itemId })
      .setLock('pessimistic_write')
      .getOne();

    if (!item) {
      throw new NotFoundException('عنصر السلة غير موجود');
    }

    return item;
  }

  private async lockAndValidateProduct(
    manager: EntityManager,
    productId: string,
  ): Promise<Product> {
    const product = await manager.findOne(Product, {
      where: { id: productId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!product) {
      throw new NotFoundException('المنتج غير موجود');
    }

    if (!product.isActive || product.deletedAt) {
      throw new BadRequestException('هذا المنتج غير متاح للشراء حالياً');
    }

    return product;
  }

  private ensureStock(product: Product, requestedQuantity: number): void {
    if (requestedQuantity > product.stockQuantity) {
      throw new BadRequestException(
        `المخزون غير كاف للمنتج "${product.name}". المتاح: ${product.stockQuantity}، المطلوب: ${requestedQuantity}`,
      );
    }
  }
}
