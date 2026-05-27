import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { Role } from '../common/enums/role.enum';
import { CategoriesService } from '../categories/categories.service';
import { User } from '../users/entities/user.entity';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductsService } from './products.service';

type MockProductQueryBuilder = Pick<
  SelectQueryBuilder<Product>,
  | 'leftJoinAndSelect'
  | 'andWhere'
  | 'orderBy'
  | 'addOrderBy'
  | 'skip'
  | 'take'
  | 'getManyAndCount'
>;

const createQueryBuilder = () => {
  const qb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  } as unknown as jest.Mocked<MockProductQueryBuilder>;

  return qb;
};

describe('ProductsService visibility', () => {
  const categoriesService = {} as CategoriesService;
  const imagesRepository = {} as Repository<ProductImage>;
  const storageService = {};
  const dataSource = {} as DataSource;

  it('keeps public product lists restricted to active products', async () => {
    const qb = createQueryBuilder();
    const productsRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    } as unknown as Repository<Product>;
    const service = new ProductsService(
      productsRepository,
      imagesRepository,
      categoriesService,
      storageService as never,
      dataSource,
    );

    await service.findAll({ includeInactive: true });

    expect(qb.andWhere).toHaveBeenCalledWith('product.isActive = :isActive', {
      isActive: true,
    });
  });

  it('allows admins to request inactive products intentionally', async () => {
    const qb = createQueryBuilder();
    const productsRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    } as unknown as Repository<Product>;
    const service = new ProductsService(
      productsRepository,
      imagesRepository,
      categoriesService,
      storageService as never,
      dataSource,
    );

    await service.findAll(
      { includeInactive: true },
      { id: 'admin-1', role: Role.ADMIN } as User,
    );

    expect(qb.andWhere).not.toHaveBeenCalledWith(
      'product.isActive = :isActive',
      { isActive: true },
    );
  });

  it('allows vendors to request inactive products intentionally', async () => {
    const qb = createQueryBuilder();
    const productsRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    } as unknown as Repository<Product>;
    const service = new ProductsService(
      productsRepository,
      imagesRepository,
      categoriesService,
      storageService as never,
      dataSource,
    );

    await service.findAll(
      { includeInactive: true },
      { id: 'vendor-1', role: Role.VENDOR } as User,
    );

    expect(qb.andWhere).not.toHaveBeenCalledWith(
      'product.isActive = :isActive',
      { isActive: true },
    );
  });
});
