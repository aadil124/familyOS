import { PrismaClient } from '@prisma/client';
import { clearDatabase } from './seed/utils';
import { seedUsers } from './seed/users.seed';
import { seedFamilies } from './seed/family.seed';
import { seedAuth } from './seed/auth.seed';
import { seedDocuments } from './seed/documents.seed';
import { seedNotifications } from './seed/notifications.seed';
import { seedEvents } from './seed/events.seed';
import { seedChats } from './seed/chats.seed';
import { seedTasks } from './seed/tasks.seed';
import { seedExpenses } from './seed/expenses.seed';
import { seedMedical } from './seed/medical.seed';
import { seedActivity } from './seed/activity.seed';
import { seedDashboard } from './seed/dashboard.seed';

const prisma = new PrismaClient();

async function main() {
  console.log('==================================================');
  console.log('🚀 Starting FamilyOS Database Seeding...');
  console.log('==================================================');
  
  const startTime = Date.now();

  // 1. Truncate/Clear all tables CASCADE for idempotency
  await clearDatabase(prisma);

  // 2. Seed Users
  const users = await seedUsers(prisma);

  // 3. Seed Families and Members
  const { families, familyMembers } = await seedFamilies(prisma, users);

  // 4. Seed Auth Refresh Tokens
  await seedAuth(prisma, users);

  // 5. Seed Categories and Documents (with OCR & Analysis)
  const { categories, documents } = await seedDocuments(prisma, families, familyMembers);

  // 6. Seed Notifications
  await seedNotifications(prisma, users, families, documents);

  // 7. Seed Events (Birthdays, Anniversaries, Reminders)
  await seedEvents(prisma, users, families, familyMembers);

  // 8. Seed Chat Histories (AI conversations)
  await seedChats(prisma, users, families);

  // 9. Seed Tasks (Household task notifications)
  await seedTasks(prisma, users, families, familyMembers);

  // 10. Seed Expenses (Utility bills / receipts)
  await seedExpenses(prisma, users, families, familyMembers, categories);

  // 11. Seed Medical (Prescriptions, vaccinations)
  await seedMedical(prisma, users, families, familyMembers, categories);

  // 12. Seed Activity Logs (Security audit trails)
  await seedActivity(prisma, users, families);

  // 13. Seed Readiness Assessments and Dashboard metrics
  await seedDashboard(prisma, users, families, familyMembers);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('==================================================');
  console.log(`✓ Database seeding completed in ${duration}s.`);
  console.log('==================================================');
  
  // Print summary totals
  const totalUsers = await prisma.user.count();
  const totalFamilies = await prisma.family.count();
  const totalMembers = await prisma.familyMember.count();
  const totalDocs = await prisma.document.count();
  const totalNotifs = await prisma.notification.count();
  const totalConvs = await prisma.aIConversation.count();
  const totalMsgs = await prisma.aIMessage.count();
  const totalAssessments = await prisma.readinessAssessment.count();

  console.log('SUMMARY OF SEEDED RECORDS:');
  console.log(`  - Users:                ${totalUsers}`);
  console.log(`  - Families:             ${totalFamilies}`);
  console.log(`  - Family Members:       ${totalMembers}`);
  console.log(`  - Documents:            ${totalDocs}`);
  console.log(`  - Readiness Assessments: ${totalAssessments}`);
  console.log(`  - Notifications:        ${totalNotifs}`);
  console.log(`  - Chat Conversations:   ${totalConvs}`);
  console.log(`  - Chat Messages:        ${totalMsgs}`);
  console.log('==================================================');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed with error:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
