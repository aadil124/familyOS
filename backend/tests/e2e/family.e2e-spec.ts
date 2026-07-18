import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { TokenService } from '../../src/auth/services/token.service';

describe('FamilyController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenService: TokenService;

  const testUserId = 'family-e2e-user-id';
  const testEmail = 'family-e2e@example.com';
  let accessToken: string;
  let createdFamilyId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    tokenService = app.get<TokenService>(TokenService);

    // Clean up any stray test data before starting
    await prisma.family.deleteMany({
      where: { ownerUserId: testUserId },
    });
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });

    // Create the test user in DB to satisfy foreign key constraint
    await prisma.user.create({
      data: {
        id: testUserId,
        fullName: 'Family E2E User',
        email: testEmail,
        passwordHash: 'hashed_password',
        status: 'active',
      },
    });

    // Generate Bearer token
    accessToken = await tokenService.generateAccessToken({
      sub: testUserId,
      email: testEmail,
      role: 'OWNER',
    });
  });

  afterAll(async () => {
    // Clean up created records
    if (prisma) {
      await prisma.family.deleteMany({
        where: { ownerUserId: testUserId },
      });
      await prisma.user.deleteMany({
        where: { id: testUserId },
      });
    }
    if (app) {
      await app.close();
    }
  });

  describe('Authentication Check', () => {
    it('should fail with 401 if bearer token is missing', () => {
      return request(app.getHttpServer())
        .get('/api/v1/families')
        .expect(401);
    });
  });

  describe('POST /api/v1/families', () => {
    it('should create a new family workspace successfully', () => {
      return request(app.getHttpServer())
        .post('/api/v1/families')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'E2E Doe Vault' })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.name).toEqual('E2E Doe Vault');
          expect(res.body.ownerUserId).toEqual(testUserId);
          createdFamilyId = res.body.id;
        });
    });

    it('should fail validation (400) if name is empty', () => {
      return request(app.getHttpServer())
        .post('/api/v1/families')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: '' })
        .expect(400);
    });

    it('should fail validation (400) if name is too long', () => {
      return request(app.getHttpServer())
        .post('/api/v1/families')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'A'.repeat(101) })
        .expect(400);
    });
  });

  describe('GET /api/v1/families', () => {
    it('should return a list of active families', () => {
      return request(app.getHttpServer())
        .get('/api/v1/families')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          const found = res.body.find((f: any) => f.id === createdFamilyId);
          expect(found).toBeDefined();
          expect(found.name).toEqual('E2E Doe Vault');
        });
    });
  });

  describe('GET /api/v1/families/:id', () => {
    it('should return family details for a valid active ID', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/families/${createdFamilyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toEqual(createdFamilyId);
          expect(res.body.name).toEqual('E2E Doe Vault');
        });
    });

    it('should return 404 for a nonexistent family ID', () => {
      return request(app.getHttpServer())
        .get('/api/v1/families/nonexistent-uuid-1234')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/v1/families/:id', () => {
    it('should update family workspace name successfully', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/families/${createdFamilyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated E2E Doe Vault' })
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toEqual(createdFamilyId);
          expect(res.body.name).toEqual('Updated E2E Doe Vault');
        });
    });

    it('should fail validation (400) if update name is empty', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/families/${createdFamilyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: '' })
        .expect(400);
    });

    it('should return 404 if family ID is nonexistent during update', () => {
      return request(app.getHttpServer())
        .patch('/api/v1/families/nonexistent-uuid-1234')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Ghost' })
        .expect(404);
    });
  });

  describe('DELETE /api/v1/families/:id', () => {
    it('should soft delete family workspace successfully', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/families/${createdFamilyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should return 404 when attempting to get the soft-deleted family workspace', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/families/${createdFamilyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 404 when attempting to patch the soft-deleted family workspace', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/families/${createdFamilyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Restored?' })
        .expect(404);
    });

    it('should return 404 when attempting to delete the already soft-deleted family workspace', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/families/${createdFamilyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
