import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { TokenService } from '../../src/auth/services/token.service';
import { DocumentProcessingStatus, DocumentReviewStatus, AnalysisStatus } from '@prisma/client';

describe('AI Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenService: TokenService;

  const testUserId = 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1';
  const testEmail = 'ai-e2e-unique@example.com';
  const testFamilyId = 'b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2';
  const testMemberId = 'c3c3c3c3-c3c3-4c3c-8c3c-c3c3c3c3c3c3';
  const testCategoryId = 'd4d4d4d4-d4d4-4d4d-8d4d-d4d4d4d4d4d4';
  let accessToken: string;
  let otherAccessToken: string;

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

    // Clean up test data
    await prisma.documentAnalysis.deleteMany({ where: { document: { familyId: testFamilyId } } });
    await prisma.oCRResult.deleteMany({ where: { document: { familyId: testFamilyId } } });
    await prisma.document.deleteMany({ where: { familyId: testFamilyId } });
    await prisma.familyMember.deleteMany({ where: { familyId: testFamilyId } });
    await prisma.family.deleteMany({ where: { id: testFamilyId } });
    await prisma.user.deleteMany({ where: { id: { in: [testUserId, 'other-user-ai-e2e'] } } });
    await prisma.documentCategory.deleteMany({
      where: {
        OR: [
          { id: testCategoryId },
          { normalizedKey: 'e2e_test_category_ai_unique' },
        ],
      },
    });

    // Seed Main User
    await prisma.user.create({
      data: {
        id: testUserId,
        fullName: 'AI E2E User',
        email: testEmail,
        passwordHash: 'hashed_pw',
        status: 'active',
      },
    });

    // Seed Other User (for authorization checks)
    await prisma.user.create({
      data: {
        id: 'other-user-ai-e2e',
        fullName: 'Other AI E2E User',
        email: 'other-ai-e2e-unique@example.com',
        passwordHash: 'hashed_pw',
        status: 'active',
      },
    });

    // Seed Family
    await prisma.family.create({
      data: {
        id: testFamilyId,
        ownerUserId: testUserId,
        name: 'Doe AI Vault E2E',
        status: 'active',
      },
    });

    // Seed Family Member (with name "Jane Doe" to match Mock AI output)
    await prisma.familyMember.create({
      data: {
        id: testMemberId,
        familyId: testFamilyId,
        fullName: 'Jane Doe',
        status: 'active',
      },
    });

    // Seed Document Category
    await prisma.documentCategory.create({
      data: {
        id: testCategoryId,
        name: 'E2E AI Category',
        normalizedKey: 'e2e_test_category_ai_unique',
        description: 'For AI testing',
        isActive: true,
      },
    });

    // Generate Tokens
    accessToken = await tokenService.generateAccessToken({
      sub: testUserId,
      email: testEmail,
      role: 'OWNER',
    });

    otherAccessToken = await tokenService.generateAccessToken({
      sub: 'other-user-ai-e2e',
      email: 'other-ai-e2e-unique@example.com',
      role: 'OWNER',
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.documentAnalysis.deleteMany({ where: { document: { familyId: testFamilyId } } });
      await prisma.oCRResult.deleteMany({ where: { document: { familyId: testFamilyId } } });
      await prisma.document.deleteMany({ where: { familyId: testFamilyId } });
      await prisma.familyMember.deleteMany({ where: { familyId: testFamilyId } });
      await prisma.family.deleteMany({ where: { id: testFamilyId } });
      await prisma.user.deleteMany({ where: { id: { in: [testUserId, 'other-user-ai-e2e'] } } });
      await prisma.documentCategory.deleteMany({ where: { id: testCategoryId } });
    }
    await app.close();
  });

  describe('GET /api/v1/families/:familyId/documents/:documentId/analysis', () => {
    let docId: string;

    it('should register document, return 201, and execute complete background pipeline (OCR -> AI)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/families/${testFamilyId}/documents`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          storageAssetId: 'cloudinary-id-789-ai-passport',
          originalFileName: 'passport.pdf',
          fileType: 'pdf',
          fileSize: 1024,
          displayName: 'My Passport AI E2E',
          familyMemberId: testMemberId,
          categoryId: testCategoryId,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      docId = response.body.id;

      // Allow background dispatchers (OCR setImmediate and AI setImmediate) to resolve
      await new Promise((resolve) => setTimeout(resolve, 800));
    });

    it('should retrieve successfully completed AI analysis record', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/families/${testFamilyId}/documents/${docId}/analysis`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(AnalysisStatus.COMPLETED);
      expect(response.body.provider).toBe('mock');
      expect(response.body.providerVersion).toBe('v1.0');
      expect(response.body.detectedDocumentType).toBe('Passport');
      expect(response.body.extractedFields.passportNumber).toBe('A1234567');
      expect(response.body.nameOnDocument).toBe('Jane Doe');
      expect(response.body.issuedDate).toBe('01/01/2020');
      expect(response.body.expiryDate).toBe('31/12/2030');
      expect(response.body.confidenceScore).toBe(0.98);
      
      // Name similarity match assertions
      expect(response.body.mismatchFlags.checks.name.matched).toBe(true);
      expect(response.body.mismatchFlags.checks.name.score).toBe(1.0);
    });

    it('should return cached analysis and not re-process on duplicate calls', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/families/${testFamilyId}/documents/${docId}/analysis`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(AnalysisStatus.COMPLETED);
    });

    it('should return 403 Forbidden if non-owner attempts to retrieve analysis', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/families/${testFamilyId}/documents/${docId}/analysis`)
        .set('Authorization', `Bearer ${otherAccessToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 Not Found if document is soft-deleted', async () => {
      // Soft delete document
      await request(app.getHttpServer())
        .delete(`/api/v1/families/${testFamilyId}/documents/${docId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      // Try fetching AI Analysis again
      const response = await request(app.getHttpServer())
        .get(`/api/v1/families/${testFamilyId}/documents/${docId}/analysis`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });
  });
});
