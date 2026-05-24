import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoritesRepository: Repository<Favorite>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async findMine(user: User): Promise<Favorite[]> {
    return this.favoritesRepository.find({
      where: { user: { id: user.id } },
      relations: ['product', 'product.category', 'product.images'],
      order: { createdAt: 'DESC' },
    });
  }

  async add(user: User, productId: string): Promise<Favorite> {
    const product = await this.productsRepository.findOne({
      where: { id: productId, isActive: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found or inactive');
    }

    const existing = await this.favoritesRepository.findOne({
      where: { user: { id: user.id }, product: { id: productId } },
      relations: ['product'],
    });
    if (existing) return existing;

    const favorite = this.favoritesRepository.create({
      user,
      product,
    });
    return this.favoritesRepository.save(favorite);
  }

  async remove(user: User, productId: string): Promise<void> {
    await this.favoritesRepository.delete({
      user: { id: user.id },
      product: { id: productId },
    });
  }
}
