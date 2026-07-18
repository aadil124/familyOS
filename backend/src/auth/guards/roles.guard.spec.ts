import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  const createMockContext = (user: any): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access if no roles are required', () => {
    mockReflector.getAllAndOverride.mockReturnValue(null);
    const context = createMockContext({ role: 'USER' });
    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should allow access if empty roles array is required', () => {
    mockReflector.getAllAndOverride.mockReturnValue([]);
    const context = createMockContext({ role: 'USER' });
    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException if user is missing', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    const context = createMockContext(null);
    expect(() => guard.canActivate(context)).toThrow(
      new ForbiddenException('Access denied: User information not found or missing role'),
    );
  });

  it('should throw ForbiddenException if user has no role defined', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    const context = createMockContext({ email: 'test@user.com' });
    expect(() => guard.canActivate(context)).toThrow(
      new ForbiddenException('Access denied: User information not found or missing role'),
    );
  });

  it('should allow access if user has one of the required roles', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['ADMIN', 'MANAGER']);
    const context = createMockContext({ role: 'ADMIN' });
    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException if user does not have any of the required roles', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['ADMIN', 'MANAGER']);
    const context = createMockContext({ role: 'USER' });
    expect(() => guard.canActivate(context)).toThrow(
      new ForbiddenException('Access denied: Insufficient permissions'),
    );
  });
});
