import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { TokenService } from '../../src/auth/services/token.service';

describe('Readiness & Life Events (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenService: TokenService;

  const testUserId = 'readiness-e2e-user-id';
  const testEmail = 'readiness-e2e@example.com';
  let accessToken: string;
  let createdFamilyId: string;
  let createdLifeEventId: string;
  let createdAssessmentId: string;

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

    // Clean up any stray test data
    await prisma.readinessAssessment.deleteMany({
      where: { requestedByUserId: testUserId },
    });
    await prisma.family.deleteMany({
      where: { ownerUserId: testUserId },
    });
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
    await prisma.lifeEvent.deleteMany({
      where: { normalizedKey: 'e2e_test_life_event' },
    });

    // Create the test user
    await prisma.user.create({
      data: {
        id: testUserId,
        fullName: 'Readiness E2E User',
        email: testEmail,
        passwordHash: 'hashed_password',
        status: 'active',
      },
    });

    // Create a test family workspace owned by the test user
    const family = await prisma.family.create({
      data: {
        ownerUserId: testUserId,
        name: 'E2E Doe Family Vault',
        status: 'active',
      },
    });
    createdFamilyId = family.id;

    // Create a test life event
    const event = await prisma.lifeEvent.create({
      data: {
        name: 'E2E Test Life Event',
        normalizedKey: 'e2e_test_life_event',
        description: 'Testing event description.',
        category: 'Test',
        expectedDocumentRules: ['identity'],
        isActive: true,
      },
    });
    createdLifeEventId = event.id;

    // Generate Bearer token
    accessToken = await tokenService.generateAccessToken({
      sub: testUserId,
      email: testEmail,
      role: 'OWNER',
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.readinessAssessment.deleteMany({
        where: { requestedByUserId: testUserId },
      });
      await prisma.family.deleteMany({
        where: { ownerUserId: testUserId },
      });
      await prisma.user.deleteMany({
        where: { id: testUserId },
      });
      await prisma.lifeEvent.deleteMany({
        where: { id: createdLifeEventId },
      });
    }
    if (app) {
      await app.close();
    }
  });

  describe('Life Event Endpoint', () => {
    it('GET /api/v1/life-events - should return active events list', () => {
      return request(app.getHttpServer())
        .get('/api/v1/life-events')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          const e2eEvent = res.body.find((e: any) => e.id === createdLifeEventId);
          expect(e2eEvent).toBeDefined();
          expect(e2eEvent.name).toEqual('E2E Test Life Event');
          expect(e2eEvent.normalizedKey).toEqual('e2e_test_life_event');
        });
    });

    it('GET /api/v1/life-events - should fail with 401 if unauthorized', () => {
      return request(app.getHttpServer())
        .get('/api/v1/life-events')
        .expect(401);
    });
  });

  describe('Readiness Assessment Endpoints', () => {
    it('POST /api/v1/families/:familyId/assessments - should run assessment and return score', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/families/${createdFamilyId}/assessments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          lifeEventId: createdLifeEventId,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.familyId).toEqual(createdFamilyId);
          expect(res.body.lifeEventId).toEqual(createdLifeEventId);
          expect(res.body.status).toEqual('completed');
          expect(res.body.readinessScore).toEqual(0); // 0% since no documents uploaded
          expect(res.body.readinessLevel).toEqual('None');
          expect(res.body.missingDocuments).toEqual(['Identity Verification']); // maps key to name
          createdAssessmentId = res.body.id;
        });
    });

    it('POST /api/v1/families/:familyId/assessments - should fail with 403 if user does not own family', async () => {
      // Create another user's family
      const otherUser = await prisma.user.create({
        data: {
          fullName: 'Other User',
          email: 'other-user-readiness@example.com',
          passwordHash: 'pass',
          status: 'active',
        },
      });
      const otherFamily = await prisma.family.create({
        data: {
          ownerUserId: otherUser.id,
          name: 'Other Family',
          status: 'active',
        },
      });

      try {
        await request(app.getHttpServer())
          .post(`/api/v1/families/${otherFamily.id}/assessments`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            lifeEventId: createdLifeEventId,
          })
          .expect(403);
      } finally {
        await prisma.family.delete({ where: { id: otherFamily.id } });
        await prisma.user.delete({ where: { id: otherUser.id } });
      }
    });

    it('GET /api/v1/families/:familyId/assessments - should list past assessments with paging wrapper', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/families/${createdFamilyId}/assessments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThanOrEqual(1);
          expect(res.body.meta).toBeDefined();
          expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
          expect(res.body.meta.page).toEqual(1);
        });
    });

    it('GET /api/v1/families/:familyId/assessments/:assessmentId - should return specific details', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/families/${createdFamilyId}/assessments/${createdAssessmentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toEqual(createdAssessmentId);
          expect(res.body.familyId).toEqual(createdFamilyId);
          expect(res.body.lifeEventId).toEqual(createdLifeEventId);
          expect(res.body.status).toEqual('completed');
          expect(res.body.readinessScore).toEqual(0);
        });
    });

    it('GET /api/v1/families/:familyId/assessments/:assessmentId - should return 404 for invalid assessment', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/families/${createdFamilyId}/assessments/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
