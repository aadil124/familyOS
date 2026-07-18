import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshDto } from '../dto/refresh.dto';
import { TokenService } from '../services/token.service';
import { Reflector } from '@nestjs/core';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
  };

  const mockTokenService = {
    verifyAccessToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: TokenService, useValue: mockTokenService },
        Reflector,
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register', async () => {
      const dto: RegisterDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePassword123!',
      };
      mockAuthService.register.mockResolvedValue({ accessToken: 'access' });
      const result = await controller.register(dto);
      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ accessToken: 'access' });
    });
  });

  describe('login', () => {
    it('should call authService.login', async () => {
      const dto: LoginDto = {
        email: 'john@example.com',
        password: 'password',
      };
      mockAuthService.login.mockResolvedValue({ accessToken: 'access' });
      const result = await controller.login(dto);
      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ accessToken: 'access' });
    });
  });

  describe('refresh', () => {
    it('should call authService.refresh', async () => {
      const dto: RefreshDto = {
        refreshToken: 'old_refresh',
      };
      mockAuthService.refresh.mockResolvedValue({ accessToken: 'new_access' });
      const result = await controller.refresh(dto);
      expect(mockAuthService.refresh).toHaveBeenCalledWith(dto.refreshToken);
      expect(result).toEqual({ accessToken: 'new_access' });
    });
  });

  describe('logout', () => {
    it('should call authService.logout', async () => {
      const user = { userId: 'user-123', email: 'john@example.com', role: 'USER' };
      mockAuthService.logout.mockResolvedValue(undefined);
      await controller.logout(user);
      expect(mockAuthService.logout).toHaveBeenCalledWith('user-123');
    });
  });

  describe('me', () => {
    it('should call authService.getCurrentUser', async () => {
      const user = { userId: 'user-123', email: 'john@example.com', role: 'USER' };
      mockAuthService.getCurrentUser.mockResolvedValue({ id: 'user-123' });
      const result = await controller.me(user);
      expect(mockAuthService.getCurrentUser).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({ id: 'user-123' });
    });
  });
});
