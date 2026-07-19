import { PrismaClient, User, Family, Document, Notification } from '@prisma/client';
import { dateInLastMonths } from './utils';
import { faker } from '@faker-js/faker';

export async function seedNotifications(
  prisma: PrismaClient,
  users: User[],
  families: Family[],
  documents: Document[]
): Promise<Notification[]> {
  console.log('Seeding Notifications...');
  const notifications: Notification[] = [];

  for (const user of users) {
    if (user.status === 'deleted') continue;

    // Find the family for this user
    // (If user is admin/superadmin, link to any family)
    let family = families.find(f => f.ownerUserId === user.id);
    if (!family) {
      family = faker.helpers.arrayElement(families);
    }
    
    // Find documents belonging to this family
    const familyDocs = documents.filter(d => d.familyId === family.id);

    const notificationConfigs = [
      {
        type: 'document_expiration',
        severity: 'critical',
        title: 'Passport Expiration Warning',
        message: 'Your Passport is expiring in less than 30 days. Please queue a renewal.',
        actionLabel: 'View Document',
        status: 'unread',
      },
      {
        type: 'upload_success',
        severity: 'info',
        title: 'Document Upload Completed',
        message: 'Aadhaar Card has been successfully uploaded and processed by AI.',
        actionLabel: 'Verify Extracted Info',
        status: 'read',
      },
      {
        type: 'assessment_completed',
        severity: 'info',
        title: 'Driving License Assessment Ready',
        message: 'Readiness evaluation for your Driving License Application is complete.',
        actionLabel: 'Check Next Steps',
        status: 'unread',
      },
      {
        type: 'security_alert',
        severity: 'warning',
        title: 'New Login Detected',
        message: 'A new login session was opened from macOS - Chrome.',
        actionLabel: 'Review Activity',
        status: 'read',
      },
      {
        type: 'reminder',
        severity: 'warning',
        title: 'Verify PAN Card Details',
        message: 'Please review the AI extracted details for your PAN Card to complete verification.',
        actionLabel: 'Verify Now',
        status: 'unread',
      }
    ];

    // Seed 3 to 5 notifications per user
    const count = faker.number.int({ min: 3, max: 5 });
    const selectedConfigs = faker.helpers.arrayElements(notificationConfigs, count);

    for (const config of selectedConfigs) {
      const createdAt = dateInLastMonths(6);
      const isRead = config.status === 'read';
      const readAt = isRead ? new Date(createdAt.getTime() + 1000 * 60 * 30) : null; // Read 30 mins later
      
      const relatedDoc = familyDocs.length > 0 ? faker.helpers.arrayElement(familyDocs) : null;

      const notif = await prisma.notification.create({
        data: {
          userId: user.id,
          familyId: family.id,
          relatedDocumentId: relatedDoc ? relatedDoc.id : null,
          relatedFamilyMemberId: relatedDoc ? relatedDoc.familyMemberId : null,
          type: config.type,
          severity: config.severity,
          title: config.title,
          message: config.message,
          status: config.status,
          actionLabel: config.actionLabel,
          actionReference: relatedDoc ? `/documents/${relatedDoc.id}` : '/dashboard',
          createdAt,
          updatedAt: createdAt,
          readAt,
        },
      });
      notifications.push(notif);
    }
  }

  console.log(`✓ ${notifications.length} Notifications seeded.`);
  return notifications;
}
