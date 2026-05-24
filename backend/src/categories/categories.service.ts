import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  /** جلب جميع التصنيفات النشطة مع أبنائها */
  async findAll(): Promise<Category[]> {
    return this.categoriesRepository.find({
      where: { isActive: true, parentId: null },
      relations: ['children'],
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  /** جلب تصنيف بالـ ID مع التحقق من وجوده */
  async findOne(id: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });
    if (!category) {
      throw new NotFoundException(`التصنيف بالمعرف ${id} غير موجود`);
    }
    return category;
  }

  /** التحقق من وجود التصنيف (للاستخدام في ProductsService) */
  async existsById(id: string): Promise<boolean> {
    const count = await this.categoriesRepository.count({ where: { id } });
    return count > 0;
  }
}
