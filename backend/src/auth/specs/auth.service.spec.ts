import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { UsersService } from '../../users/users.service';
import { UsersRepository } from '../../users/users.repository';
import { TokenService } from '../services/token.service';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { UnauthorizedException } from '@nestjs/common';
import * as passwordUtil from '../utils/password.util';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let usersRepository: UsersRepository;
  let tokenService: TokenService;
  let refreshTokenRepository: RefreshTokenRepository;

  const mockUsersService = {
    createUser: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
  };

  const mockUsersRepository = {
    findByEmail: jest.fn(),
  };

  const mockTokenService = {
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
  };

  const mockRefreshTokenRepository = {
    create: jest.fn(),
    findActiveToken: jest.fn(),
    update: jest.fn(),
    revokeFamily: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: TokenService, useValue: mockTokenService },
        { provide: RefreshTokenRepository, useValue: mockRefreshTokenRepository },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    usersRepository = module.get<UsersRepository>(UsersRepository);
    tokenService = module.get<TokenService>(TokenService);
    refreshTokenRepository = module.get<RefreshTokenRepository>(RefreshTokenRepository);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const mockUserResponse = {
    id: 'user-123',
    fullName: 'John Doe',
    email: 'john@example.com',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('register', () => {
    it('should register a user and generate tokens', async () => {
      const dto: RegisterDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePassword123!',
      };

      mockUsersService.createUser.mockResolvedValue(mockUserResponse);
      mockTokenService.generateAccessToken.mockResolvedValue('access_token');
      mockTokenService.generateRefreshToken.mockResolvedValue('refresh_token');
      mockRefreshTokenRepository.create.mockResolvedValue({});

      const result = await service.register(dto);

      expect(mockUsersService.createUser).toHaveBeenCalledWith({
        email: dto.email,
        password: dto.password,
        firstName: dto.firstName,
        lastName: dto.lastName,
      });
      expect(mockTokenService.generateAccessToken).toHaveBeenCalled();
      expect(mockTokenService.generateRefreshToken).toHaveBeenCalled();
      expect(mockRefreshTokenRepository.create).toHaveBeenCalled();
      expect(result.accessToken).toBe('access_token');
      expect(result.refreshToken).toBe('refresh_token');
      expect(result.user.fullName).toBe('John Doe');
    });
  });

  describe('login', () => {
    it('should authenticate user and return tokens', async () => {
      const dto: LoginDto = {
        email: 'john@example.com',
        password: 'SecurePassword123!',
      };

      const validateSpy = jest.spyOn(service, 'validateCredentials').mockResolvedValue(mockUserResponse);
      mockTokenService.generateAccessToken.mockResolvedValue('access_token');
      mockTokenService.generateRefreshToken.mockResolvedValue('refresh_token');
      mockRefreshTokenRepository.create.mockResolvedValue({});

      const result = await service.login(dto);

      expect(validateSpy).toHaveBeenCalledWith(dto.email, dto.password);
      expect(result.accessToken).toBe('access_token');
      expect(result.refreshToken).toBe('refresh_token');
    });
  });

  describe('validateCredentials', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(null);
      await expect(service.validateCredentials('john@example.com', 'password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue({ passwordHash: 'hashed' });
      jest.spyOn(passwordUtil, 'comparePassword').mockResolvedValue(false);

      await expect(service.validateCredentials('john@example.com', 'password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return user response on valid credentials', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue({ passwordHash: 'hashed' });
      jest.spyOn(passwordUtil, 'comparePassword').mockResolvedValue(true);
      mockUsersService.findByEmail.mockResolvedValue(mockUserResponse);

      const result = await service.validateCredentials('john@example.com', 'password');

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith('john@example.com');
      expect(result).toEqual(mockUserResponse);
    });
  });

  describe('refresh', () => {
    it('should throw UnauthorizedException if active token not found', async () => {
      mockTokenService.verifyRefreshToken.mockResolvedValue({ sub: 'user-123', email: 'john@example.com', role: 'USER' });
      mockRefreshTokenRepository.findActiveToken.mockResolvedValue(null);

      await expect(service.refresh('token')).rejects.toThrow(UnauthorizedException);
    });

    it('should rotate tokens and revoke old refresh token', async () => {
      const mockPayload = { sub: 'user-123', email: 'john@example.com', role: 'USER' };
      const mockActiveToken = { id: 'active-token-id', tokenHash: 'old_refresh' };

      mockTokenService.verifyRefreshToken.mockResolvedValue(mockPayload);
      mockRefreshTokenRepository.findActiveToken.mockResolvedValue(mockActiveToken);
      mockTokenService.generateAccessToken.mockResolvedValue('new_access_token');
      mockTokenService.generateRefreshToken.mockResolvedValue('new_refresh_token');
      mockRefreshTokenRepository.create.mockResolvedValue({ id: 'new_token_id' });
      mockRefreshTokenRepository.update.mockResolvedValue({});

      const result = await service.refresh('old_refresh');

      expect(mockRefreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockPayload.sub,
          tokenHash: 'new_refresh_token',
          status: 'active',
        }),
      );
      expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith('active-token-id', {
        status: 'revoked',
        revokedAt: expect.any(Date),
        replacedByTokenId: 'new_token_id',
      });
      expect(result.accessToken).toBe('new_access_token');
      expect(result.refreshToken).toBe('new_refresh_token');
    });
  });

  describe('logout', () => {
    it('should call revokeFamily repository method', async () => {
      mockRefreshTokenRepository.revokeFamily.mockResolvedValue(undefined);
      await service.logout('user-123');
      expect(mockRefreshTokenRepository.revokeFamily).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getCurrentUser', () => {
    it('should call usersService findById', async () => {
      mockUsersService.findById.mockResolvedValue(mockUserResponse);
      const result = await service.getCurrentUser('user-123');
      expect(mockUsersService.findById).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockUserResponse);
    });
  });
});
