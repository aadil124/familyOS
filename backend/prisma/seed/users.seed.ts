import { PrismaClient, User } from '@prisma/client';
import { getSharedPasswordHash, dateInLastMonths } from './utils';
import { faker } from '@faker-js/faker';

export async function seedUsers(prisma: PrismaClient): Promise<User[]> {
  console.log('Seeding Users...');
  const passwordHash = await getSharedPasswordHash();
  const users: User[] = [];

  // 1. Generate 2 Super Admins
  for (let i = 1; i <= 2; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = `superadmin${i}@familyos.com`;
    
    const user = await prisma.user.create({
      data: {
        fullName: `${firstName} ${lastName}`,
        email,
        passwordHash,
        status: 'active',
        emailVerifiedAt: dateInLastMonths(12),
        lastLoginAt: dateInLastMonths(1),
        createdAt: dateInLastMonths(24),
        updatedAt: dateInLastMonths(12),
      },
    });
    users.push(user);
  }

  // 2. Generate 3 Admins
  for (let i = 1; i <= 3; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = `admin${i}@familyos.com`;
    
    const user = await prisma.user.create({
      data: {
        fullName: `${firstName} ${lastName}`,
        email,
        passwordHash,
        status: 'active',
        emailVerifiedAt: dateInLastMonths(12),
        lastLoginAt: dateInLastMonths(1),
        createdAt: dateInLastMonths(24),
        updatedAt: dateInLastMonths(12),
      },
    });
    users.push(user);
  }

  // 3. Generate 10 Family Owners
  for (let i = 1; i <= 10; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = `owner${i}@familyos.com`;
    
    // Mix status values: 9 active, 1 inactive/deleted for testing
    const status = i === 10 ? 'deleted' : 'active';
    const deletedAt = i === 10 ? dateInLastMonths(1) : null;

    const user = await prisma.user.create({
      data: {
        fullName: `${firstName} ${lastName}`,
        email,
        passwordHash,
        status,
        emailVerifiedAt: dateInLastMonths(12),
        lastLoginAt: dateInLastMonths(2),
        createdAt: dateInLastMonths(24),
        updatedAt: dateInLastMonths(12),
        deletedAt,
      },
    });
    users.push(user);
  }

  console.log(`✓ ${users.length} Users seeded.`);
  return users;
}
