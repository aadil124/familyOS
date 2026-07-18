import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { TokenService } from '../../src/auth/services/token.service';

describe('FamilyMemberController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenService: TokenService;

  const testUserId = 'member-e2e-user-id';
  const testEmail = 'member-e2e@example.com';
  const testFamilyId = 'member-e2e-family-id';
  let accessToken: string;
  let createdMemberId: string;

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
    await prisma.familyMember.deleteMany({
      where: { familyId: testFamilyId },
    });
    await prisma.family.deleteMany({
      where: { id: testFamilyId },
    });
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });

    // Create the test user in DB to satisfy foreign key constraint
    await prisma.user.create({
      data: {
        id: testUserId,
        fullName: 'Member E2E User',
        email: testEmail,
        passwordHash: 'hashed_password',
        status: 'active',
      },
    });

    // Create the test family in DB
    await prisma.family.create({
      data: {
        id: testFamilyId,
        ownerUserId: testUserId,
        name: 'Doe Family E2E',
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
    if (prisma) {
      await prisma.familyMember.deleteMany({
        where: { familyId: testFamilyId },
      });
      await prisma.family.deleteMany({
        where: { id: testFamilyId },
      });
      await prisma.user.deleteMany({
        where: { id: testUserId },
      });
    }
    if (app) {
      await app.close();
    }
  });

  describe('Authorization', () => {
    it('should return 401 Unauthorized when Bearer token is missing', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/families/${testFamilyId}/members`)
        .send({
          fullName: 'Jane Doe',
          relationship: 'Spouse',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/families/:familyId/members', () => {
    it('should create a family member successfully and return mapped DTO', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/families/${testFamilyId}/members`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fullName: 'Jane Doe',
          relationship: 'Spouse',
          dateOfBirth: '1990-01-01T00:00:00.000Z',
          primaryEmail: 'jane@example.com',
          primaryPhone: '1234567890',
        });

      expect(response.status).toBe(201); // Standard created status in NestJS
      expect(response.body).toHaveProperty('id');
      expect(response.body.fullName).toBe('Jane Doe');
      expect(response.body.relationship).toBe('Spouse');
      expect(response.body.status).toBe('active');
      createdMemberId = response.body.id;
    });

    it('should return 400 Bad Request when validation fails (fullName missing)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/families/${testFamilyId}/members`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          relationship: 'Spouse',
        });

      expect(response.status).toBe(400);
    });

    it('should return 404 Not Found when family workspace does not exist', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/families/nonexistent-family-id/members')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fullName: 'Jane Doe',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/v1/families/:familyId/members', () => {
    it('should retrieve list of members in family workspace', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/families/${testFamilyId}/members`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body.some((m: any) => m.id === createdMemberId)).toBe(true);
    });

    it('should return 404 Not Found if family workspace does not exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/families/nonexistent-family-id/members')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/v1/families/:familyId/members/:memberId', () => {
    it('should retrieve specific member details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/families/${testFamilyId}/members/${createdMemberId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(createdMemberId);
      expect(response.body.fullName).toBe('Jane Doe');
    });

    it('should return 404 Not Found if member does not exist under that family', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/families/different-family-id/members/${createdMemberId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/families/:familyId/members/:memberId', () => {
    it('should update member details successfully', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/families/${testFamilyId}/members/${createdMemberId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          relationship: 'Wife',
        });

      expect(response.status).toBe(200);
      expect(response.body.relationship).toBe('Wife');
    });

    it('should return 404 if member is from a different family', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/families/different-family-id/members/${createdMemberId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          relationship: 'Wife',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/families/:familyId/members/:memberId', () => {
    it('should soft delete member successfully and return 204 No Content', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/families/${testFamilyId}/members/${createdMemberId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(204);
    });

    it('should return 404 Not Found on subsequent requests to read or update the deleted member', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/families/${testFamilyId}/members/${createdMemberId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });
  });
});
