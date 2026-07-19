import { PrismaClient, User, RefreshToken } from '@prisma/client';
import { dateInLastMonths } from './utils';
import { faker } from '@faker-js/faker';

export async function seedAuth(prisma: PrismaClient, users: User[]): Promise<RefreshToken[]> {
  console.log('Seeding Auth Refresh Tokens...');
  const tokens: RefreshToken[] = [];

  const deviceTypes = [
    { label: 'iPhone 15 Pro', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148' },
    { label: 'MacBook Pro', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' },
    { label: 'Chrome on Windows', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36' },
    { label: 'Samsung Galaxy S24', ua: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 Mobile Safari/537.36' }
  ];

  for (const user of users) {
    if (user.status === 'deleted') continue;

    // 1. Create an active token (valid session)
    const device = faker.helpers.arrayElement(deviceTypes);
    const activeIssued = dateInLastMonths(1);
    const activeExpires = new Date(activeIssued);
    activeExpires.setDate(activeExpires.getDate() + 7);

    const activeToken = await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: faker.git.commitSha(),
        status: 'active',
        issuedAt: activeIssued,
        expiresAt: activeExpires,
        deviceLabel: device.label,
        ipAddress: faker.internet.ipv4(),
        userAgent: device.ua,
        createdAt: activeIssued,
        updatedAt: activeIssued,
      },
    });
    tokens.push(activeToken);

    // 2. Create an expired token (expired session)
    const expiredDevice = faker.helpers.arrayElement(deviceTypes);
    const expiredIssued = new Date();
    expiredIssued.setDate(expiredIssued.getDate() - 30);
    const expiredExpires = new Date(expiredIssued);
    expiredExpires.setDate(expiredExpires.getDate() + 7);

    const expiredToken = await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: faker.git.commitSha(),
        status: 'expired',
        issuedAt: expiredIssued,
        expiresAt: expiredExpires,
        deviceLabel: expiredDevice.label,
        ipAddress: faker.internet.ipv4(),
        userAgent: expiredDevice.ua,
        createdAt: expiredIssued,
        updatedAt: expiredIssued,
      },
    });
    tokens.push(expiredToken);

    // 3. Create a revoked token (revoked session)
    const revokedDevice = faker.helpers.arrayElement(deviceTypes);
    const revokedIssued = new Date();
    revokedIssued.setDate(revokedIssued.getDate() - 15);
    const revokedExpires = new Date(revokedIssued);
    revokedExpires.setDate(revokedExpires.getDate() + 7);
    const revokedAt = new Date(revokedIssued);
    revokedAt.setHours(revokedAt.getHours() + 12);

    const revokedToken = await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: faker.git.commitSha(),
        status: 'revoked',
        issuedAt: revokedIssued,
        expiresAt: revokedExpires,
        revokedAt,
        deviceLabel: revokedDevice.label,
        ipAddress: faker.internet.ipv4(),
        userAgent: revokedDevice.ua,
        createdAt: revokedIssued,
        updatedAt: revokedAt,
      },
    });
    tokens.push(revokedToken);
  }

  console.log(`✓ ${tokens.length} Auth Refresh Tokens seeded.`);
  return tokens;
}
