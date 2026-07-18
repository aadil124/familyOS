import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { FamilyRoleGuard } from '../guards/family-role.guard';
import { UserRole } from '../enums/role.enum';

describe('FamilyRoleGuard', () => {
  let guard: FamilyRoleGuard;
  let reflector: Reflector;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FamilyRoleGuard,
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    guard = module.get<FamilyRoleGuard>(FamilyRoleGuard);
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
    const context = createMockContext({ role: UserRole.MEMBER });
    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should allow access if empty roles array is required', () => {
    mockReflector.getAllAndOverride.mockReturnValue([]);
    const context = createMockContext({ role: UserRole.MEMBER });
    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException if user is missing', () => {
    mockReflector.getAllAndOverride.mockReturnValue([UserRole.OWNER]);
    const context = createMockContext(null);
    expect(() => guard.canActivate(context)).toThrow(
      new ForbiddenException('Access denied: User information not found or missing role'),
    );
  });

  it('should throw ForbiddenException if user has no role defined', () => {
    mockReflector.getAllAndOverride.mockReturnValue([UserRole.OWNER]);
    const context = createMockContext({ email: 'test@user.com' });
    expect(() => guard.canActivate(context)).toThrow(
      new ForbiddenException('Access denied: User information not found or missing role'),
    );
  });

  it('should allow access if user has one of the required roles', () => {
    mockReflector.getAllAndOverride.mockReturnValue([UserRole.OWNER, UserRole.ADMIN]);
    const context = createMockContext({ role: UserRole.OWNER });
    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException if user does not have any of the required roles', () => {
    mockReflector.getAllAndOverride.mockReturnValue([UserRole.OWNER, UserRole.ADMIN]);
    const context = createMockContext({ role: UserRole.MEMBER });
    expect(() => guard.canActivate(context)).toThrow(
      new ForbiddenException('Access denied: Insufficient permissions'),
    );
  });
});
