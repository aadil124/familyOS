import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from './token.service';
import { JwtPayload } from '../interfaces/auth.interface';

describe('TokenService', () => {
  let service: TokenService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      switch (key) {
        case 'JWT_SECRET':
          return 'test_access_secret_key_at_least_32_characters';
        case 'JWT_REFRESH_SECRET':
          return 'test_refresh_secret_key_at_least_32_characters';
        case 'JWT_ACCESS_EXPIRES_IN':
          return '15m';
        case 'JWT_REFRESH_EXPIRES_IN':
          return '7d';
        default:
          return defaultValue;
      }
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: JwtService,
          useValue: new JwtService({}),
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const testPayload: JwtPayload = {
    sub: 'user-uuid-1234',
    email: 'user@familyos.com',
    role: 'ADMIN',
  };

  describe('AccessToken operations', () => {
    it('should generate and verify access tokens', async () => {
      const token = await service.generateAccessToken(testPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const verified = await service.verifyAccessToken(token);
      expect(verified).toBeDefined();
      expect(verified.sub).toBe(testPayload.sub);
      expect(verified.email).toBe(testPayload.email);
      expect(verified.role).toBe(testPayload.role);
    });

    it('should throw an error on invalid or expired access token', async () => {
      await expect(service.verifyAccessToken('invalid-token')).rejects.toThrow();
    });
  });

  describe('RefreshToken operations', () => {
    it('should generate and verify refresh tokens', async () => {
      const token = await service.generateRefreshToken(testPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const verified = await service.verifyRefreshToken(token);
      expect(verified).toBeDefined();
      expect(verified.sub).toBe(testPayload.sub);
      expect(verified.email).toBe(testPayload.email);
      expect(verified.role).toBe(testPayload.role);
    });

    it('should throw an error on invalid or expired refresh token', async () => {
      await expect(service.verifyRefreshToken('invalid-token')).rejects.toThrow();
    });
  });
});
