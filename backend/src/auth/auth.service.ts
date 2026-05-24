import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';

const BCRYPT_SALT_ROUNDS = 12;

/**
 * خدمة المصادقة الرئيسية
 * تتحكم في دورة حياة المستخدم الكاملة: تسجيل، دخول، تجديد، خروج
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // 📝 تسجيل مستخدم جديد
  // ─────────────────────────────────────────────────────────────────────────
  async register(dto: RegisterDto): Promise<{ user: User; tokens: Tokens }> {
    // تشفير كلمة المرور بـ bcrypt (12 salt rounds كما في التوثيق)
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      phone: dto.phone,
      role: Role.CUSTOMER,
    });

    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return { user, tokens };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 🔑 تسجيل الدخول
  // ─────────────────────────────────────────────────────────────────────────
  async login(dto: LoginDto): Promise<{ user: User; tokens: Tokens }> {
    const user = await this.usersService.findByEmail(dto.email);

    // ملاحظة أمنية: رسالة الخطأ موحدة لمنع معرفة ما إذا كان البريد موجوداً
    if (!user) {
      throw new UnauthorizedException('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    if (!user.isActive) {
      throw new ForbiddenException('الحساب موقوف، يرجى التواصل مع الدعم');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      throw new UnauthorizedException('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return { user, tokens };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 🔄 تجديد الـ Tokens (يُستدعى من JwtRefreshGuard)
  // ─────────────────────────────────────────────────────────────────────────
  async refreshTokens(user: User): Promise<Tokens> {
    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 🚪 تسجيل الخروج — تفريغ الـ Refresh Token
  // ─────────────────────────────────────────────────────────────────────────
  async logout(userId: string): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 🔧 دوال مساعدة خاصة
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * توليد Access Token وRefresh Token معاً
   */
  private async generateTokens(user: User): Promise<Tokens> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN', '15m'),
      } as any),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      } as any),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * حفظ hash الـ Refresh Token في قاعدة البيانات
   */
  private async saveRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hashedToken = await bcrypt.hash(refreshToken, BCRYPT_SALT_ROUNDS);
    await this.usersService.updateRefreshToken(userId, hashedToken);
  }
}

// ─── Type مساعد ─────────────────────────────────────────────────────────────
interface Tokens {
  accessToken: string;
  refreshToken: string;
}
