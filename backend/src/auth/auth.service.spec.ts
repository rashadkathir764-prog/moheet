import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { Role } from '../common/enums/role.enum';

describe('AuthService', () => {
  it('forces public registrations to CUSTOMER even when role is supplied', async () => {
    const createdUser = {
      id: 'user-1',
      email: 'attacker@example.com',
      fullName: 'Attacker',
      role: Role.CUSTOMER,
    };

    const usersService = {
      create: jest.fn().mockResolvedValue(createdUser),
      updateRefreshToken: jest.fn().mockResolvedValue(undefined),
    } as unknown as UsersService;

    const jwtService = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token'),
    } as unknown as JwtService;

    const configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_SECRET: 'access-secret',
          JWT_ACCESS_EXPIRES_IN: '15m',
          JWT_REFRESH_SECRET: 'refresh-secret',
          JWT_REFRESH_EXPIRES_IN: '7d',
        };

        return values[key] ?? defaultValue;
      }),
    } as unknown as ConfigService;

    const service = new AuthService(usersService, jwtService, configService);

    await service.register({
      email: 'attacker@example.com',
      fullName: 'Attacker',
      password: 'StrongPass@123',
      role: Role.ADMIN,
    } as any);

    expect(usersService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'attacker@example.com',
        fullName: 'Attacker',
        role: Role.CUSTOMER,
      }),
    );
  });
});
