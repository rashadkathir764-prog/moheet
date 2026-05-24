import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  VendorProfile,
  VendorStatus,
} from './entities/vendor-profile.entity';
import { RegisterVendorDto } from './dto/register-vendor.dto';
import { UpdateVendorStatusDto } from './dto/update-vendor-status.dto';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

const BCRYPT_SALT_ROUNDS = 12;

@Injectable()
export class VendorsService {
  constructor(
    @InjectRepository(VendorProfile)
    private readonly vendorsRepository: Repository<VendorProfile>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  async register(dto: RegisterVendorDto): Promise<VendorProfile> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.usersRepository.findOne({ where: { email } });
    if (existing) {
      throw new BadRequestException('Email is already registered');
    }

    return this.dataSource.transaction(async (manager) => {
      const user = manager.create(User, {
        email,
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS),
        fullName: dto.fullName,
        phone: dto.phone,
        role: Role.VENDOR,
        isActive: false,
        isVerified: false,
      });
      const savedUser = await manager.save(User, user);

      const profile = manager.create(VendorProfile, {
        userId: savedUser.id,
        storeName: dto.storeName,
        slug: await this.buildUniqueSlug(dto.storeName),
        description: dto.description,
        businessEmail: dto.businessEmail,
        businessPhone: dto.businessPhone,
        businessAddress: dto.businessAddress,
        status: VendorStatus.PENDING,
      });
      return manager.save(VendorProfile, profile);
    });
  }

  async findAll(status?: VendorStatus): Promise<VendorProfile[]> {
    return this.vendorsRepository.find({
      where: status ? { status } : {},
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findMine(user: User): Promise<VendorProfile> {
    const profile = await this.vendorsRepository.findOne({
      where: { userId: user.id },
      relations: ['user'],
    });
    if (!profile) throw new NotFoundException('Vendor profile not found');
    return profile;
  }

  async updateStatus(
    id: string,
    dto: UpdateVendorStatusDto,
  ): Promise<VendorProfile> {
    const profile = await this.vendorsRepository.findOne({ where: { id } });
    if (!profile) throw new NotFoundException('Vendor profile not found');

    await this.dataSource.transaction(async (manager) => {
      await manager.update(VendorProfile, id, {
        status: dto.status,
        adminNotes: dto.adminNotes,
        approvedAt: dto.status === VendorStatus.APPROVED ? new Date() : null,
      });

      await manager.update(User, profile.userId, {
        isActive: dto.status === VendorStatus.APPROVED,
        isVerified: dto.status === VendorStatus.APPROVED,
      });

      await this.notificationsService.createForUser(
        {
          userId: profile.userId,
          type: NotificationType.VENDOR_STATUS_CHANGED,
          title: 'Vendor application updated',
          message: `Your vendor application is now ${dto.status}`,
          data: { vendorProfileId: id, status: dto.status },
        },
        manager,
      );
    });

    return this.vendorsRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  private async buildUniqueSlug(name: string): Promise<string> {
    const base = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'vendor';

    let slug = base;
    let counter = 1;
    while (await this.vendorsRepository.findOne({ where: { slug } })) {
      counter += 1;
      slug = `${base}-${counter}`;
    }
    return slug;
  }
}
