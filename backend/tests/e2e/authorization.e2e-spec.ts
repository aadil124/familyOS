import { Controller, Get, UseGuards } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { FamilyRoleGuard } from '../../src/auth/guards/family-role.guard';
import { Roles } from '../../src/auth/decorators/roles.decorator';
import { UserRole } from '../../src/auth/enums/role.enum';
import { TokenService } from '../../src/auth/services/token.service';
import { AuthModule } from '../../src/auth/auth.module';

@Controller('test-auth')
class TestAuthController {
  @Get('admin')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, FamilyRoleGuard)
  adminOnly() {
    return { success: true };
  }

  @Get('member-or-owner')
  @Roles(UserRole.MEMBER, UserRole.OWNER)
  @UseGuards(JwtAuthGuard, FamilyRoleGuard)
  memberOrOwner() {
    return { success: true };
  }
}

describe('Authorization & RBAC (e2e)', () => {
  let app: INestApplication;
  let tokenService: TokenService;

  let adminToken: string;
  let memberToken: string;
  let ownerToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, AuthModule],
      controllers: [TestAuthController],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    tokenService = app.get<TokenService>(TokenService);

    // Generate tokens for testing
    adminToken = await tokenService.generateAccessToken({
      sub: 'admin-123',
      email: 'admin@familyos.com',
      role: UserRole.ADMIN,
    });

    memberToken = await tokenService.generateAccessToken({
      sub: 'member-123',
      email: 'member@familyos.com',
      role: UserRole.MEMBER,
    });

    ownerToken = await tokenService.generateAccessToken({
      sub: 'owner-123',
      email: 'owner@familyos.com',
      role: UserRole.OWNER,
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('JWT Access Token Security', () => {
    it('should fail with 401 if token is missing', () => {
      return request(app.getHttpServer())
        .get('/api/test-auth/admin')
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toEqual('Authentication token is missing');
        });
    });

    it('should fail with 401 if token is malformed', () => {
      return request(app.getHttpServer())
        .get('/api/test-auth/admin')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toEqual('Invalid or expired authentication token');
        });
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    it('should allow access to admin-only route if user is ADMIN', () => {
      return request(app.getHttpServer())
        .get('/api/test-auth/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });

    it('should deny access to admin-only route if user is MEMBER', () => {
      return request(app.getHttpServer())
        .get('/api/test-auth/admin')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403)
        .expect((res) => {
          expect(res.body.message).toEqual('Access denied: Insufficient permissions');
        });
    });

    it('should deny access to admin-only route if user is OWNER', () => {
      return request(app.getHttpServer())
        .get('/api/test-auth/admin')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403)
        .expect((res) => {
          expect(res.body.message).toEqual('Access denied: Insufficient permissions');
        });
    });

    it('should allow access to member-or-owner route if user is MEMBER', () => {
      return request(app.getHttpServer())
        .get('/api/test-auth/member-or-owner')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });

    it('should allow access to member-or-owner route if user is OWNER', () => {
      return request(app.getHttpServer())
        .get('/api/test-auth/member-or-owner')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });

    it('should deny access to member-or-owner route if user is ADMIN', () => {
      return request(app.getHttpServer())
        .get('/api/test-auth/member-or-owner')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403)
        .expect((res) => {
          expect(res.body.message).toEqual('Access denied: Insufficient permissions');
        });
    });
  });
});
