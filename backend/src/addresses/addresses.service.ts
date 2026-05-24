import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Address } from './entities/address.entity';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';
import { ShippingAddressDto } from '../orders/dto/create-order.dto';

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(Address)
    private readonly addressesRepository: Repository<Address>,

    private readonly dataSource: DataSource,
  ) {}

  async create(customer: User, dto: CreateAddressDto): Promise<Address> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const shouldBeDefault =
        dto.isDefault || (await this.countUserAddresses(customer.id, manager)) === 0;

      if (shouldBeDefault) {
        await this.clearDefault(customer.id, manager);
      }

      const address = manager.create(Address, {
        userId: customer.id,
        label: dto.label ?? 'Home',
        recipientName: dto.recipientName,
        phone: dto.phone,
        city: dto.city,
        district: dto.district,
        street: dto.street,
        fullAddress: dto.fullAddress,
        country: dto.country ?? 'Yemen',
        postalCode: dto.postalCode,
        latitude: dto.latitude,
        longitude: dto.longitude,
        isDefault: shouldBeDefault,
      });

      return manager.save(Address, address);
    });
  }

  async findMine(customer: User): Promise<Address[]> {
    return this.addressesRepository.find({
      where: { userId: customer.id },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: User): Promise<Address> {
    const address = await this.addressesRepository.findOne({ where: { id } });
    if (!address) {
      throw new NotFoundException('العنوان غير موجود');
    }

    this.assertCanAccessAddress(address, user);
    return address;
  }

  async update(
    id: string,
    user: User,
    dto: UpdateAddressDto,
  ): Promise<Address> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const address = await manager.findOne(Address, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!address) {
        throw new NotFoundException('العنوان غير موجود');
      }

      this.assertCanAccessAddress(address, user);

      if (dto.isDefault) {
        await this.clearDefault(address.userId, manager);
      }

      await manager.update(Address, id, {
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.recipientName !== undefined && {
          recipientName: dto.recipientName,
        }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.district !== undefined && { district: dto.district }),
        ...(dto.street !== undefined && { street: dto.street }),
        ...(dto.fullAddress !== undefined && { fullAddress: dto.fullAddress }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      });

      return manager.findOne(Address, { where: { id } });
    });
  }

  async remove(id: string, user: User): Promise<void> {
    await this.dataSource.transaction(async (manager: EntityManager) => {
      const address = await manager.findOne(Address, { where: { id } });
      if (!address) {
        throw new NotFoundException('العنوان غير موجود');
      }

      this.assertCanAccessAddress(address, user);
      await manager.delete(Address, { id });

      if (address.isDefault) {
        const replacement = await manager.findOne(Address, {
          where: { userId: address.userId },
          order: { createdAt: 'DESC' },
        });

        if (replacement) {
          await manager.update(Address, replacement.id, { isDefault: true });
        }
      }
    });
  }

  async setDefault(id: string, customer: User): Promise<Address> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const address = await manager.findOne(Address, { where: { id } });
      if (!address) {
        throw new NotFoundException('العنوان غير موجود');
      }

      this.assertCanAccessAddress(address, customer);
      await this.clearDefault(address.userId, manager);
      await manager.update(Address, address.id, { isDefault: true });

      return manager.findOne(Address, { where: { id } });
    });
  }

  async resolveShippingAddress(
    userId: string,
    addressId: string,
    manager?: EntityManager,
  ): Promise<ShippingAddressDto> {
    const repo = manager ? manager.getRepository(Address) : this.addressesRepository;
    const address = await repo.findOne({ where: { id: addressId, userId } });

    if (!address) {
      throw new NotFoundException('العنوان المحفوظ غير موجود أو لا يخص حسابك');
    }

    return {
      fullName: address.recipientName,
      phone: address.phone,
      fullAddress: address.fullAddress,
      city: address.city,
      country: address.country,
    };
  }

  private async countUserAddresses(
    userId: string,
    manager: EntityManager,
  ): Promise<number> {
    return manager.count(Address, { where: { userId } });
  }

  private async clearDefault(
    userId: string,
    manager: EntityManager,
  ): Promise<void> {
    await manager.update(Address, { userId }, { isDefault: false });
  }

  private assertCanAccessAddress(address: Address, user: User): void {
    if (user.role === Role.ADMIN) return;

    if (address.userId !== user.id) {
      throw new ForbiddenException('ليس لديك صلاحية للوصول إلى هذا العنوان');
    }
  }
}
