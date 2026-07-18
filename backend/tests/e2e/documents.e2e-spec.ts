import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { TokenService } from '../../src/auth/services/token.service';

describe('DocumentsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenService: TokenService;

  const testUserId = '33333333-3333-4333-8333-333333333333';
  const testEmail = 'doc-e2e@example.com';
  const testFamilyId = '44444444-4444-4444-8444-444444444444';
  const testMemberId = '11111111-1111-4111-8111-111111111111';
  const testCategoryId = '22222222-2222-4222-8222-222222222222';
  let accessToken: string;
  let createdDocId: string;

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
    await prisma.document.deleteMany({ where: { familyId: testFamilyId } });
    await prisma.familyMember.deleteMany({ where: { familyId: testFamilyId } });
    await prisma.documentCategory.deleteMany({
      where: {
        OR: [
          { id: testCategoryId },
          { normalizedKey: 'e2e_test_category' },
        ],
      },
    });
    await prisma.family.deleteMany({ where: { id: testFamilyId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });

    // Seed User
    await prisma.user.create({
      data: {
        id: testUserId,
        fullName: 'Doc E2E User',
        email: testEmail,
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
        normalizedKey: 'e2e_test_category',
        description: 'For testing',
        isActive: true,
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
      await prisma.document.deleteMany({ where: { familyId: testFamilyId } });
      await prisma.familyMember.deleteMany({ where: { familyId: testFamilyId } });
      await prisma.documentCategory.deleteMany({
        where: {
          OR: [
            { id: testCategoryId },
            { normalizedKey: 'e2e_test_category' },
          ],
        },
      });
      await prisma.family.deleteMany({ where: { id: testFamilyId } });
      await prisma.user.deleteMany({ where: { id: testUserId } });
    }
    if (app) {
      await app.close();
    }
  });

  describe('Authorization', () => {
    it('should return 401 when Bearer token is missing', async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/v1/families/${testFamilyId}/documents`,
      );
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/families/:familyId/documents/categories', () => {
    it('should retrieve list of active document categories', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/families/${testFamilyId}/documents/categories`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      const found = response.body.find((c: any) => c.id === testCategoryId);
      expect(found).toBeDefined();
      expect(found.normalizedKey).toBe('e2e_test_category');
    });
  });

  describe('POST /api/v1/families/:familyId/documents/upload-signature', () => {
    it('should return Cloudinary upload parameters successfully', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/families/${testFamilyId}/documents/upload-signature`)
        .set('Authorization', `Bearer ${accessToken}`);

      if (response.status !== 200) {
        console.error('upload-signature failed:', response.body);
      }
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('signature');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.folder).toBe(`familyos/${testFamilyId}`);
      expect(response.body.type).toBe('authenticated');
    });

    it('should return 403 Forbidden if user does not own family workspace', async () => {
      const otherToken = await tokenService.generateAccessToken({
        sub: 'other-user',
        email: 'other@example.com',
        role: 'OWNER',
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/families/${testFamilyId}/documents/upload-signature`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/v1/families/:familyId/documents', () => {
    it('should register uploaded document successfully', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/families/${testFamilyId}/documents`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          storageAssetId: 'cloudinary-id-123',
          originalFileName: 'passport.pdf',
          fileType: 'pdf',
          fileSize: 1024 * 1024, // 1MB
          displayName: 'My Passport E2E',
          familyMemberId: testMemberId,
          categoryId: testCategoryId,
        });

      if (response.status !== 201) {
        console.error('registerDocument failed:', response.body);
      }
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.originalFileName).toBe('passport.pdf');
      expect(response.body.displayName).toBe('My Passport E2E');
      expect(response.body.uploadStatus).toBe('uploaded');
      expect(response.body.processingStatus).toBe('pending');
      createdDocId = response.body.id;
    });

    it('should return 400 Bad Request when file extension is invalid', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/families/${testFamilyId}/documents`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          storageAssetId: 'cloudinary-id-456',
          originalFileName: 'script.sh',
          fileType: 'sh',
          fileSize: 1024,
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 Bad Request when file size is > 10MB', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/families/${testFamilyId}/documents`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          storageAssetId: 'cloudinary-id-456',
          originalFileName: 'heavy.pdf',
          fileType: 'pdf',
          fileSize: 11 * 1024 * 1024, // 11MB
        });

      expect(response.status).toBe(400);
    });

    it('should return 404 Not Found if associated family member is invalid', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/families/${testFamilyId}/documents`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          storageAssetId: 'cloudinary-id-456',
          originalFileName: 'passport.pdf',
          fileType: 'pdf',
          familyMemberId: '00000000-0000-0000-0000-000000000000',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/v1/families/:familyId/documents', () => {
    it('should list active documents in family workspace', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/families/${testFamilyId}/documents`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      const found = response.body.find((doc: any) => doc.id === createdDocId);
      expect(found).toBeDefined();
      expect(found.originalFileName).toBe('passport.pdf');
    });

    it('should support filtering by categoryId', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/families/${testFamilyId}/documents?categoryId=${testCategoryId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.every((d: any) => d.categoryId === testCategoryId)).toBe(true);
    });
  });

  describe('GET /api/v1/families/:familyId/documents/:documentId', () => {
    it('should retrieve document details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/families/${testFamilyId}/documents/${createdDocId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(createdDocId);
      expect(response.body.displayName).toBe('My Passport E2E');
    });

    it('should return 404 for invalid document ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/families/${testFamilyId}/documents/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/families/:familyId/documents/:documentId/metadata', () => {
    it('should update document metadata successfully', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/families/${testFamilyId}/documents/${createdDocId}/metadata`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          displayName: 'Updated Passport Name',
        });

      expect(response.status).toBe(200);
      expect(response.body.displayName).toBe('Updated Passport Name');
    });
  });

  describe('GET /api/v1/families/:familyId/documents/:documentId/download', () => {
    it('should return secure download URL', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/families/${testFamilyId}/documents/${createdDocId}/download`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('url');
      expect(response.body.expiresIn).toBe(900);
    });
  });

  describe('DELETE /api/v1/families/:familyId/documents/:documentId', () => {
    it('should soft delete document successfully', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/families/${testFamilyId}/documents/${createdDocId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(204); // HttpStatus.NO_CONTENT
    });

    it('should return 404 when trying to retrieve soft-deleted document', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/families/${testFamilyId}/documents/${createdDocId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });
  });
});
