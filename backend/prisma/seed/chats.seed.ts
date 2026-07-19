import { PrismaClient, User, Family } from '@prisma/client';
import { dateInLastMonths } from './utils';
import { faker } from '@faker-js/faker';

export async function seedChats(
  prisma: PrismaClient,
  users: User[],
  families: Family[]
): Promise<void> {
  console.log('Seeding AI Conversations and Messages...');
  let totalConversations = 0;
  let totalMessages = 0;

  const familyOwners = users.filter(u => u.email.startsWith('owner') && u.status !== 'deleted');

  for (const owner of familyOwners) {
    const family = families.find(f => f.ownerUserId === owner.id);
    if (!family) continue;

    // 1. Conversation 1: Passport Renewal Help
    const conv1 = await prisma.aIConversation.create({
      data: {
        familyId: family.id,
        userId: owner.id,
        title: 'Passport Renewal Checklist',
        status: 'active',
        lastMessageAt: dateInLastMonths(1),
        createdAt: dateInLastMonths(2),
        updatedAt: dateInLastMonths(1),
      },
    });
    totalConversations++;

    const messages1 = [
      {
        role: 'user',
        content: 'Hi, I need to renew my passport. What documents do I need to prepare?',
      },
      {
        role: 'assistant',
        content: 'Hello! For a Passport Renewal, you need to provide Identity Verification (such as your current Passport and Aadhaar Card) and Proof of Address (like a utility bill or bank statement). Let me check what we have in your family vault.',
      },
      {
        role: 'assistant',
        content: 'I see that you have a valid Aadhaar Card uploaded, but we do not have your current Passport scanned. I suggest uploading a scan of the front and back pages of your old passport so I can verify the details.',
      },
      {
        role: 'user',
        content: 'Okay, I will scan it and upload it shortly. Can I upload it as a PDF?',
      },
      {
        role: 'assistant',
        content: 'Yes! PDF, JPG, and PNG formats are fully supported. Once uploaded, I will automatically extract the passport number, name, and expiry date to check your readiness.',
      }
    ];

    let currentMsgTime = dateInLastMonths(2);
    for (const msg of messages1) {
      currentMsgTime = new Date(currentMsgTime.getTime() + 1000 * 60 * 5); // 5 mins apart
      await prisma.aIMessage.create({
        data: {
          conversationId: conv1.id,
          role: msg.role,
          content: msg.content,
          createdAt: currentMsgTime,
        },
      });
      totalMessages++;
    }

    // 2. Conversation 2: Driving License help
    const conv2 = await prisma.aIConversation.create({
      data: {
        familyId: family.id,
        userId: owner.id,
        title: 'Driving License Verification',
        status: 'completed',
        lastMessageAt: dateInLastMonths(3),
        createdAt: dateInLastMonths(4),
        updatedAt: dateInLastMonths(3),
      },
    });
    totalConversations++;

    const messages2 = [
      {
        role: 'user',
        content: 'Can you look at my uploaded driving license? It says verification failed.',
      },
      {
        role: 'assistant',
        content: 'Let me look. Ah, the image you uploaded (blurry_image.jpg) failed OCR text extraction because the camera was shaky and the text is not readable. Can you please re-upload a clear, well-lit photo of your driving license?',
      },
      {
        role: 'user',
        content: 'Ah, I see. I will take another photo and try again.',
      },
      {
        role: 'assistant',
        content: 'Perfect. Make sure all four corners of the card are visible and there is no glare on the text.',
      }
    ];

    let currentMsgTime2 = dateInLastMonths(4);
    for (const msg of messages2) {
      currentMsgTime2 = new Date(currentMsgTime2.getTime() + 1000 * 60 * 5);
      await prisma.aIMessage.create({
        data: {
          conversationId: conv2.id,
          role: msg.role,
          content: msg.content,
          createdAt: currentMsgTime2,
        },
      });
      totalMessages++;
    }
  }

  console.log(`✓ ${totalConversations} AI Conversations with ${totalMessages} Messages seeded.`);
}
