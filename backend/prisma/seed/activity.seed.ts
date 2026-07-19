import { PrismaClient, User, Family } from '@prisma/client';
import { randomDate } from './utils';
import { faker } from '@faker-js/faker';

export async function seedActivity(
  prisma: PrismaClient,
  users: User[],
  families: Family[]
): Promise<void> {
  console.log('Seeding Activity Logs (as security and audit notifications)...');
  let auditCount = 0;

  for (const user of users) {
    if (user.status === 'deleted') continue;

    const family = families.find(f => f.ownerUserId === user.id) || families[0];

    const auditActions = [
      { type: 'security_alert', severity: 'warning', title: 'Password Changed Successfully', msg: 'The account password was updated. If you did not do this, contact support immediately.' },
      { type: 'profile_update', severity: 'info', title: 'Profile Updated', msg: 'User details updated: change of primary contact number.' },
      { type: 'activity_log', severity: 'info', title: 'Document Uploaded', msg: 'New document: passport_scan.pdf uploaded successfully.' },
      { type: 'activity_log', severity: 'info', title: 'AI OCR Processing Completed', msg: 'Aadhaar Card scanned and analyzed. High confidence score obtained.' },
      { type: 'security_alert', severity: 'info', title: 'Successful Login', msg: 'Session started from Chrome on Windows. IP: 192.168.1.14.' },
      { type: 'security_alert', severity: 'info', title: 'Successful Logout', msg: 'Session closed for device Mobile App Safari.' },
    ];

    // Seed 3-5 audit activities per user spread over the last 12 months
    const count = faker.number.int({ min: 3, max: 5 });
    const selectedAudits = faker.helpers.arrayElements(auditActions, count);

    for (const audit of selectedAudits) {
      const recordDate = randomDate(new Date(2026, 0, 1), new Date());

      await prisma.notification.create({
        data: {
          userId: user.id,
          familyId: family.id,
          type: audit.type,
          severity: audit.severity,
          title: audit.title,
          message: audit.msg,
          status: 'read', // activity logs are audit records, usually pre-read/archived
          actionLabel: audit.type === 'security_alert' ? 'Review Security' : 'View Logs',
          actionReference: '/dashboard',
          createdAt: recordDate,
          updatedAt: recordDate,
          readAt: recordDate,
        },
      });
      auditCount++;
    }
  }

  console.log(`✓ ${auditCount} Activity Logs (audit notifications) seeded.`);
}
