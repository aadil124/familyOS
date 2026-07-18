import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testEmail = 'e2e-test-auth@familyos.com';
  const testPassword = 'Password123!';
  const testFirstName = 'E2E';
  const testLastName = 'User';

  beforeAll(async () => {
    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      app.setGlobalPrefix('api');
      app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
      await app.init();

      prisma = app.get<PrismaService>(PrismaService);

      // Clean up if previous tests left state
      if (prisma) {
        await prisma.refreshToken.deleteMany({
          where: {
            user: {
              email: testEmail,
            },
          },
        });
        await prisma.user.deleteMany({
          where: {
            email: testEmail,
          },
        });
      }
    } catch (error) {
      console.error('Error during beforeAll setup:', error);
      throw error;
    }
  });

  afterAll(async () => {
    // Final cleanup
    if (prisma) {
      await prisma.refreshToken.deleteMany({
        where: {
          user: {
            email: testEmail,
          },
        },
      });
      await prisma.user.deleteMany({
        where: {
          email: testEmail,
        },
      });
    }
    if (app) {
      await app.close();
    }
  });

  let accessToken = '';
  let refreshToken = '';
  let previousRefreshToken = '';

  describe('/api/v1/auth/register (POST)', () => {
    it('should fail with validation error for weak password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          firstName: testFirstName,
          lastName: testLastName,
          email: testEmail,
          password: 'weak',
        })
        .expect(400);
    });

    it('should successfully register a user and return tokens', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          firstName: testFirstName,
          lastName: testLastName,
          email: testEmail,
          password: testPassword,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.user).toBeDefined();
          expect(res.body.user.email).toEqual(testEmail);
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
        });
    });

    it('should fail if email already exists', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          firstName: testFirstName,
          lastName: testLastName,
          email: testEmail,
          password: testPassword,
        })
        .expect(409);
    });
  });

  describe('/api/v1/auth/login (POST)', () => {
    it('should fail with invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword!',
        })
        .expect(401);
    });

    it('should successfully authenticate and return token pair', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
          accessToken = res.body.accessToken;
          refreshToken = res.body.refreshToken;
        });
    });
  });

  describe('/api/v1/auth/me (GET)', () => {
    it('should fail if unauthorized', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('should return current user details on valid token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.email).toEqual(testEmail);
          expect(res.body.fullName).toEqual(`${testFirstName} ${testLastName}`);
        });
    });
  });

  describe('/api/v1/auth/refresh (POST)', () => {
    it('should fail with invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token',
        })
        .expect(401);
    });

    it('should rotate tokens and return a new pair', () => {
      previousRefreshToken = refreshToken;
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
          expect(res.body.refreshToken).not.toEqual(refreshToken);
          accessToken = res.body.accessToken;
          refreshToken = res.body.refreshToken;
        });
    });

    it('should fail to use the old refresh token (replay attack prevention)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: previousRefreshToken,
        })
        .expect(401);
    });
  });

  describe('/api/v1/auth/logout (POST)', () => {
    it('should fail if unauthorized', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .expect(401);
    });

    it('should successfully log out and invalidate refresh tokens', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should fail to refresh token after logging out', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(401);
    });
  });
});
