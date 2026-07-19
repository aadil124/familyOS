import { PrismaClient, User, Family, FamilyMember } from '@prisma/client';
import { randomDate } from './utils';
import { faker } from '@faker-js/faker';

export async function seedEvents(
  prisma: PrismaClient,
  users: User[],
  families: Family[],
  familyMembers: FamilyMember[]
): Promise<void> {
  console.log('Seeding Events (Birthdays, Anniversaries, Reminders as notifications)...');
  let eventNotificationsCount = 0;

  for (const user of users) {
    if (user.status === 'deleted') continue;

    const family = families.find(f => f.ownerUserId === user.id) || families[0];
    const members = familyMembers.filter(m => m.familyId === family.id);
    
    if (members.length === 0) continue;

    // 1. Birthday Reminders
    for (const member of members) {
      if (!member.dateOfBirth) continue;
      
      const dobMonth = member.dateOfBirth.getMonth();
      const dobDate = member.dateOfBirth.getDate();
      
      // Calculate upcoming birthday in 2026
      const upcomingBirthday = new Date(2026, dobMonth, dobDate);
      
      const isPast = upcomingBirthday < new Date();
      const relativeMessage = isPast 
        ? `Celebrated ${member.fullName}'s birthday on ${upcomingBirthday.toLocaleDateString()}.`
        : `Upcoming birthday: Wish ${member.fullName} on ${upcomingBirthday.toLocaleDateString()}!`;

      await prisma.notification.create({
        data: {
          userId: user.id,
          familyId: family.id,
          relatedFamilyMemberId: member.id,
          type: 'birthday_reminder',
          severity: 'info',
          title: `Birthday: ${member.fullName}`,
          message: relativeMessage,
          status: isPast ? 'read' : 'unread',
          actionLabel: 'Send Message',
          actionReference: `/family/chat?memberId=${member.id}`,
          createdAt: randomDate(new Date(2026, 0, 1), new Date()),
          updatedAt: new Date(),
        },
      });
      eventNotificationsCount++;
    }

    // 2. Anniversaries (Spouse event)
    const spouse = members.find(m => m.relationship === 'spouse');
    if (spouse) {
      const anniversaryDate = randomDate(new Date(2026, 0, 1), new Date(2026, 11, 30));
      const isPast = anniversaryDate < new Date();

      await prisma.notification.create({
        data: {
          userId: user.id,
          familyId: family.id,
          relatedFamilyMemberId: spouse.id,
          type: 'anniversary_reminder',
          severity: 'warning',
          title: `Wedding Anniversary`,
          message: isPast
            ? `Happy Wedding Anniversary! Celebrated on ${anniversaryDate.toLocaleDateString()}.`
            : `Wedding Anniversary reminder on ${anniversaryDate.toLocaleDateString()}. Don't forget a gift!`,
          status: isPast ? 'read' : 'unread',
          actionLabel: 'Schedule Gift',
          actionReference: '/dashboard',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      eventNotificationsCount++;
    }

    // 3. Household Meetings and Reminders (spread across past, present, and future)
    const meetings = [
      { title: 'Monthly Family Budget Review', offsetDays: -15, desc: 'Review expenses and bills for last month.' },
      { title: 'Weekend Grocery & Household Planning', offsetDays: 1, desc: 'Plan groceries and tasks for the upcoming week.' },
      { title: 'Elder Checkup & Health Insurance Review', offsetDays: 45, desc: 'Schedule health review for elderly grandparents.' },
    ];

    for (const meet of meetings) {
      const meetDate = new Date();
      meetDate.setDate(meetDate.getDate() + meet.offsetDays);
      const isPast = meet.offsetDays < 0;

      await prisma.notification.create({
        data: {
          userId: user.id,
          familyId: family.id,
          type: 'meeting',
          severity: isPast ? 'info' : 'warning',
          title: meet.title,
          message: `${meet.desc} Date: ${meetDate.toLocaleDateString()}`,
          status: isPast ? 'read' : 'unread',
          actionLabel: isPast ? 'View Summary' : 'Add to Calendar',
          actionReference: '/dashboard',
          createdAt: randomDate(new Date(2026, 0, 1), new Date()),
          updatedAt: new Date(),
        },
      });
      eventNotificationsCount++;
    }
  }

  console.log(`✓ ${eventNotificationsCount} Event-based Notifications seeded.`);
}
