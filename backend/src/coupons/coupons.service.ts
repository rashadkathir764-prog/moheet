import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  Coupon,
  CouponDiscountType,
} from './entities/coupon.entity';
import { CouponRedemption } from './entities/coupon-redemption.entity';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { User } from '../users/entities/user.entity';
import { Order } from '../orders/entities/order.entity';

export interface CouponCalculation {
  coupon: Coupon;
  discountAmount: number;
}

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponsRepository: Repository<Coupon>,
    @InjectRepository(CouponRedemption)
    private readonly redemptionsRepository: Repository<CouponRedemption>,
  ) {}

  async create(dto: CreateCouponDto): Promise<Coupon> {
    const coupon = this.couponsRepository.create({
      ...dto,
      code: dto.code.trim().toUpperCase(),
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      minOrderAmount: dto.minOrderAmount ?? 0,
      perUserLimit: dto.perUserLimit ?? 1,
      isActive: dto.isActive ?? true,
    });
    return this.couponsRepository.save(coupon);
  }

  async findAll(): Promise<Coupon[]> {
    return this.couponsRepository.find({ order: { createdAt: 'DESC' } });
  }

  async update(id: string, dto: UpdateCouponDto): Promise<Coupon> {
    const coupon = await this.couponsRepository.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');

    await this.couponsRepository.update(id, {
      ...dto,
      ...(dto.code && { code: dto.code.trim().toUpperCase() }),
      ...(dto.startsAt !== undefined && {
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      }),
      ...(dto.endsAt !== undefined && {
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      }),
    });
    return this.couponsRepository.findOne({ where: { id } });
  }

  async remove(id: string): Promise<void> {
    await this.couponsRepository.delete(id);
  }

  async validate(
    user: User,
    dto: ValidateCouponDto,
  ): Promise<CouponCalculation> {
    return this.calculateDiscount(dto.code, dto.subtotal, user.id);
  }

  async calculateDiscount(
    code: string,
    subtotal: number,
    userId: string,
    manager?: EntityManager,
  ): Promise<CouponCalculation> {
    const couponRepo = manager
      ? manager.getRepository(Coupon)
      : this.couponsRepository;
    const redemptionRepo = manager
      ? manager.getRepository(CouponRedemption)
      : this.redemptionsRepository;

    const coupon = await couponRepo.findOne({
      where: { code: code.trim().toUpperCase() },
      lock: manager ? { mode: 'pessimistic_write' } : undefined,
    });
    if (!coupon || !coupon.isActive) {
      throw new BadRequestException('Coupon is invalid or inactive');
    }

    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) {
      throw new BadRequestException('Coupon is not active yet');
    }
    if (coupon.endsAt && coupon.endsAt < now) {
      throw new BadRequestException('Coupon has expired');
    }
    if (subtotal < coupon.minOrderAmount) {
      throw new BadRequestException(
        `Minimum order amount is ${coupon.minOrderAmount}`,
      );
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    const userUses = await redemptionRepo.count({
      where: { coupon: { id: coupon.id }, user: { id: userId } },
    });
    if (userUses >= coupon.perUserLimit) {
      throw new BadRequestException('Coupon user limit reached');
    }

    let discountAmount =
      coupon.type === CouponDiscountType.PERCENTAGE
        ? subtotal * (coupon.value / 100)
        : coupon.value;

    if (coupon.maxDiscountAmount) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
    }
    discountAmount = Math.min(discountAmount, subtotal);
    discountAmount = Math.round(discountAmount * 100) / 100;

    return { coupon, discountAmount };
  }

  async redeem(
    coupon: Coupon,
    user: User,
    order: Order,
    discountAmount: number,
    manager: EntityManager,
  ): Promise<void> {
    await manager.save(
      CouponRedemption,
      manager.create(CouponRedemption, {
        coupon,
        user,
        order,
        discountAmount,
      }),
    );
    await manager.increment(Coupon, { id: coupon.id }, 'usedCount', 1);
  }
}
