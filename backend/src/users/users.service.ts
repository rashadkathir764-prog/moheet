import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

/**
 * خدمة المستخدمين — طبقة الوصول لبيانات المستخدمين
 * تُستخدَم من AuthModule وأي موديل آخر يحتاج بيانات المستخدم
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /**
   * إيجاد مستخدم عبر البريد الإلكتروني
   * يُستخدَم في المصادقة — يُرجع null إذا لم يوجد (لا يرفع خطأ)
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });
  }

  /**
   * إيجاد مستخدم عبر الـ ID
   * يرفع NotFoundException إذا لم يوجد
   */
  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`المستخدم بالمعرف ${id} غير موجود`);
    }

    return user;
  }

  async findAll(limit = 100): Promise<User[]> {
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);

    return this.usersRepository.find({
      order: { createdAt: 'DESC' },
      take: safeLimit,
    });
  }

  /**
   * إنشاء مستخدم جديد
   * يرفع ConflictException إذا كان البريد مستخدماً مسبقاً
   */
  async create(userData: Partial<User>): Promise<User> {
    const existing = await this.findByEmail(userData.email);

    if (existing) {
      throw new ConflictException('البريد الإلكتروني مستخدم بالفعل');
    }

    const user = this.usersRepository.create({
      ...userData,
      email: userData.email.toLowerCase().trim(),
    });

    return this.usersRepository.save(user);
  }

  /**
   * تحديث بيانات المستخدم (Partial Update)
   */
  async update(id: string, updateData: Partial<User>): Promise<User> {
    await this.usersRepository.update(id, updateData);
    return this.findById(id);
  }

  /**
   * حفظ الـ Refresh Token المُشفَّر (أو تفريغه عند الـ logout)
   */
  async updateRefreshToken(
    userId: string,
    hashedToken: string | null,
  ): Promise<void> {
    await this.usersRepository.update(userId, {
      refreshToken: hashedToken,
    });
  }
}
