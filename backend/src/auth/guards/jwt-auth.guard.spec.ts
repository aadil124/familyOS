import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';
import { TokenService } from '../services/token.service';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;
  let tokenService: TokenService;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const mockTokenService = {
    verifyAccessToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: TokenService, useValue: mockTokenService },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get<Reflector>(Reflector);
    tokenService = module.get<TokenService>(TokenService);
  });

  const createMockContext = (headers: Record<string, string>): ExecutionContext => {
    const request = {
      headers,
      user: null,
    };

    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow public routes', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const context = createMockContext({});
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockReflector.getAllAndOverride).toHaveBeenCalled();
  });

  it('should throw UnauthorizedException if no token is provided', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const context = createMockContext({});
    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Authentication token is missing'),
    );
  });

  it('should throw UnauthorizedException if authorization format is invalid', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const context = createMockContext({ authorization: 'InvalidFormat token' });
    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Authentication token is missing'),
    );
  });

  it('should authenticate valid tokens and populate request.user', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const payload = { sub: 'user-123', email: 'test@user.com', role: 'USER' };
    mockTokenService.verifyAccessToken.mockResolvedValue(payload);

    const requestHeaders = { authorization: 'Bearer valid-jwt-token' };
    const context = createMockContext(requestHeaders);
    const request = context.switchToHttp().getRequest();

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockTokenService.verifyAccessToken).toHaveBeenCalledWith('valid-jwt-token');
    expect(request.user).toEqual({
      userId: 'user-123',
      email: 'test@user.com',
      role: 'USER',
    });
  });

  it('should throw UnauthorizedException if token verification fails', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockTokenService.verifyAccessToken.mockRejectedValue(new Error('Token expired'));

    const requestHeaders = { authorization: 'Bearer expired-jwt-token' };
    const context = createMockContext(requestHeaders);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Invalid or expired authentication token'),
    );
  });
});
