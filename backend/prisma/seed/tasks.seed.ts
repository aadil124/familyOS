import { PrismaClient, User, Family, FamilyMember } from '@prisma/client';
import { randomDate } from './utils';
import { faker } from '@faker-js/faker';

export async function seedTasks(
  prisma: PrismaClient,
  users: User[],
  families: Family[],
  familyMembers: FamilyMember[]
): Promise<void> {
  console.log('Seeding Tasks (as task-based notifications)...');
  let taskCount = 0;

  for (const user of users) {
    if (user.status === 'deleted') continue;

    const family = families.find(f => f.ownerUserId === user.id);
    if (!family) continue;

    const members = familyMembers.filter(m => m.familyId === family.id);
    if (members.length === 0) continue;

    const householdTasks = [
      { title: 'Buy Weekly Groceries', desc: 'Purchase milk, eggs, vegetables, and bread from store.', offsetDays: 1, type: 'pending' },
      { title: 'Clean the Attic & Garage', desc: 'Organize storage boxes and clean floor.', offsetDays: -2, type: 'overdue' },
      { title: 'Renew Auto Insurance Policy', desc: 'Submit driving license and vehicle registration document.', offsetDays: 3, type: 'in-progress' },
      { title: 'Pay Electricity & Water Bills', desc: 'Pay utilities bill online.', offsetDays: -4, type: 'completed' },
    ];

    for (const task of householdTasks) {
      const assignedMember = faker.helpers.arrayElement(members);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + task.offsetDays);

      let severity = 'info';
      let notifStatus = 'unread';
      let readAt: Date | null = null;

      if (task.type === 'overdue') {
        severity = 'critical';
      } else if (task.type === 'completed') {
        severity = 'info';
        notifStatus = 'read';
        readAt = new Date();
      } else if (task.type === 'in-progress') {
        severity = 'warning';
      }

      await prisma.notification.create({
        data: {
          userId: user.id,
          familyId: family.id,
          relatedFamilyMemberId: assignedMember.id,
          type: 'household_task',
          severity,
          title: `Task: ${task.title}`,
          message: `${task.desc} Assigned to: ${assignedMember.fullName}. Status: ${task.type.toUpperCase()}. Due Date: ${dueDate.toLocaleDateString()}`,
          status: notifStatus,
          actionLabel: 'Update Status',
          actionReference: `/family/tasks`,
          createdAt: randomDate(new Date(2026, 0, 1), new Date()),
          updatedAt: new Date(),
          readAt,
        },
      });
      taskCount++;
    }
  }

  console.log(`✓ ${taskCount} Tasks seeded.`);
}
