import { PrismaClient, User, Family, FamilyMember } from '@prisma/client';
import { dateInLastMonths, randomDate } from './utils';
import { faker } from '@faker-js/faker';

export async function seedFamilies(
  prisma: PrismaClient,
  users: User[]
): Promise<{ families: Family[]; familyMembers: FamilyMember[] }> {
  console.log('Seeding Families and Family Members...');
  
  const families: Family[] = [];
  const familyMembers: FamilyMember[] = [];

  // Filter out family owners (the last 10 users)
  const owners = users.filter(u => u.email.startsWith('owner'));

  for (let i = 0; i < owners.length; i++) {
    const owner = owners[i];
    const lastName = owner.fullName.split(' ')[1] || faker.person.lastName();
    
    // Create Family
    const familyStatus = owner.status === 'deleted' ? 'deleted' : 'active';
    const deletedAt = owner.status === 'deleted' ? owner.deletedAt : null;

    const family = await prisma.family.create({
      data: {
        name: `${lastName} Household`,
        ownerUserId: owner.id,
        status: familyStatus,
        createdAt: owner.createdAt,
        updatedAt: owner.updatedAt,
        deletedAt,
      },
    });
    families.push(family);

    // Now, seed 4 to 6 Family Members
    const numMembers = faker.number.int({ min: 4, max: 6 });
    const membersData = [
      // 1. The Owner (Head/Parent)
      {
        fullName: owner.fullName,
        relationship: 'head',
        dateOfBirth: randomDate(new Date(1975, 0, 1), new Date(1990, 11, 31)),
        primaryEmail: owner.email,
        primaryPhone: faker.phone.number(),
      },
      // 2. Spouse
      {
        fullName: `${faker.person.firstName()} ${lastName}`,
        relationship: 'spouse',
        dateOfBirth: randomDate(new Date(1976, 0, 1), new Date(1992, 11, 31)),
        primaryEmail: faker.internet.email(),
        primaryPhone: faker.phone.number(),
      },
      // 3. First Child
      {
        fullName: `${faker.person.firstName()} ${lastName}`,
        relationship: 'child',
        dateOfBirth: randomDate(new Date(2008, 0, 1), new Date(2018, 11, 31)),
        primaryEmail: faker.internet.email(),
        primaryPhone: faker.phone.number(),
      },
      // 4. Grandparent / Elder
      {
        fullName: `${faker.person.firstName()} ${lastName}`,
        relationship: 'grandparent',
        dateOfBirth: randomDate(new Date(1945, 0, 1), new Date(1958, 11, 31)),
        primaryEmail: faker.internet.email(),
        primaryPhone: faker.phone.number(),
      }
    ];

    // If more than 4, add optional members
    if (numMembers >= 5) {
      // Second Child
      membersData.push({
        fullName: `${faker.person.firstName()} ${lastName}`,
        relationship: 'child',
        dateOfBirth: randomDate(new Date(2015, 0, 1), new Date(2023, 11, 31)),
        primaryEmail: faker.internet.email(),
        primaryPhone: faker.phone.number(),
      });
    }
    if (numMembers === 6) {
      // Elder / Aunt / Uncle
      membersData.push({
        fullName: `${faker.person.firstName()} ${lastName}`,
        relationship: 'elder',
        dateOfBirth: randomDate(new Date(1950, 0, 1), new Date(1965, 11, 31)),
        primaryEmail: faker.internet.email(),
        primaryPhone: faker.phone.number(),
      });
    }

    for (const mData of membersData) {
      const member = await prisma.familyMember.create({
        data: {
          familyId: family.id,
          fullName: mData.fullName,
          relationship: mData.relationship,
          dateOfBirth: mData.dateOfBirth,
          primaryEmail: mData.primaryEmail,
          primaryPhone: mData.primaryPhone,
          status: familyStatus,
          createdAt: owner.createdAt,
          updatedAt: owner.updatedAt,
          deletedAt,
        },
      });
      familyMembers.push(member);
    }
  }

  console.log(`✓ ${families.length} Families and ${familyMembers.length} Family Members seeded.`);
  return { families, familyMembers };
}
