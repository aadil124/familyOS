import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { TokenService } from '../../src/auth/services/token.service';
import { DocumentProcessingStatus, OCRStatus } from '@prisma/client';

describe('OCR Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenService: TokenService;

  // Use unique IDs to prevent database collisions with documents.e2e-spec.ts
  const testUserId = '55555555-5555-4555-8555-555555555555';
  const testEmail = 'ocr-e2e-unique@example.com';
  const testFamilyId = '66666666-6666-4666-8666-666666666666';
  const testMemberId = '77777777-7777-4777-8777-777777777777';
  const testCategoryId = '88888888-8888-4888-8888-888888888888';
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

    // Clean up test data first
    await prisma.oCRResult.deleteMany({ where: { document: { familyId: testFamilyId } } });
    await prisma.document.deleteMany({ where: { familyId: testFamilyId } });
    await prisma.familyMember.deleteMany({ where: { familyId: testFamilyId } });
    await prisma.family.deleteMany({ where: { id: testFamilyId } });
    await prisma.user.deleteMany({ where: { id: { in: [testUserId, 'other-user-e2e-unique'] } } });
    await prisma.documentCategory.deleteMany({
      where: {
        OR: [
          { id: testCategoryId },
          { normalizedKey: 'e2e_test_category_ocr_unique' },
        ],
      },
    });

    // Seed Main User
    await prisma.user.create({
      data: {
        id: testUserId,
        fullName: 'OCR E2E User',
        email: testEmail,
        passwordHash: 'hashed_pw',
        status: 'active',
      },
    });

    // Seed Other User (for authorization checks)
    await prisma.user.create({
      data: {
        id: 'other-user-e2e-unique',
        fullName: 'Other E2E User',
        email: 'other-ocr-e2e-unique@example.com',
        passwordHash: 'hashed_pw',
        status: 'active',
      },
    });

    // Seed Family
    await prisma.family.create({
      data: {
        id: testFamilyId,
        ownerUserId: testUserId,
        name: 'Doe Vault E2E',
        status: 'active',
      },
    });

    // Seed Family Member
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
        name: 'E2E Test Category',
        normalizedKey: 'e2e_test_category_ocr_unique',
        description: 'For testing',
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
      sub: 'other-user-e2e-unique',
      email: 'other-ocr-e2e-unique@example.com',
      role: 'OWNER',
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.oCRResult.deleteMany({ where: { document: { familyId: testFamilyId } } });
      await prisma.document.deleteMany({ where: { familyId: testFamilyId } });
      await prisma.familyMember.deleteMany({ where: { familyId: testFamilyId } });
      await prisma.family.deleteMany({ where: { id: testFamilyId } });
      await prisma.user.deleteMany({ where: { id: { in: [testUserId, 'other-user-e2e-unique'] } } });
      await prisma.documentCategory.deleteMany({ where: { id: testCategoryId } });
    }
    await app.close();
  });

  describe('GET /api/v1/families/:familyId/documents/:documentId/ocr', () => {
    let docId: string;

    it('should register document, return 201, and trigger background OCR', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/families/${testFamilyId}/documents`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          storageAssetId: 'cloudinary-id-123-ocr-passport',
          originalFileName: 'passport.pdf',
          fileType: 'pdf',
          fileSize: 1024,
          displayName: 'My Passport OCR',
          familyMemberId: testMemberId,
          categoryId: testCategoryId,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      docId = response.body.id;

      // Allow setImmediate background queue task to resolve
      await new Promise((resolve) => setTimeout(resolve, 400));
    });

    it('should retrieve successfully completed OCR result and cache details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/families/${testFamilyId}/documents/${docId}/ocr`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(OCRStatus.COMPLETED);
      expect(response.body.provider).toBe('mock');
      expect(response.body.providerVersion).toBe('v1.0');
      expect(response.body.extractedText).toContain('PASSPORT');
      expect(response.body.confidenceScore).toBe(0.95);
    });

    it('should return cached result on duplicate calls and prevent re-processing', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/families/${testFamilyId}/documents/${docId}/ocr`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(OCRStatus.COMPLETED);
    });

    it('should return 403 Forbidden if non-owner attempts to fetch result', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/families/${testFamilyId}/documents/${docId}/ocr`)
        .set('Authorization', `Bearer ${otherAccessToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 Not Found if document is soft-deleted', async () => {
      // Soft delete document
      await request(app.getHttpServer())
        .delete(`/api/v1/families/${testFamilyId}/documents/${docId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      // Try fetching OCR again
      const response = await request(app.getHttpServer())
        .get(`/api/v1/families/${testFamilyId}/documents/${docId}/ocr`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });
  });
});
