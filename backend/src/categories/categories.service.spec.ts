import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';

describe('CategoriesService', () => {
  const categoriesRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
  } as unknown as Repository<Category>;

  let service: CategoriesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CategoriesService(categoriesRepository);
  });

  it('loads only active root categories with children in store order', async () => {
    const categories = [{ id: 'category-1', name: 'Phones' }] as Category[];
    jest.spyOn(categoriesRepository, 'find').mockResolvedValue(categories);

    await expect(service.findAll()).resolves.toBe(categories);
    expect(categoriesRepository.find).toHaveBeenCalledWith({
      where: { isActive: true, parentId: null },
      relations: ['children'],
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  });

  it('rejects unknown category ids', async () => {
    jest.spyOn(categoriesRepository, 'findOne').mockResolvedValue(null);

    await expect(service.findOne('missing-category')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('reports whether a category exists for product validation', async () => {
    jest.spyOn(categoriesRepository, 'count').mockResolvedValue(1);

    await expect(service.existsById('category-1')).resolves.toBe(true);
    expect(categoriesRepository.count).toHaveBeenCalledWith({
      where: { id: 'category-1' },
    });
  });
});
