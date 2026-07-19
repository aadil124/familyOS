import { PrismaClient, User, Family, FamilyMember, LifeEvent, ReadinessAssessment } from '@prisma/client';
import { dateInLastMonths, randomDate } from './utils';
import { faker } from '@faker-js/faker';

export async function seedDashboard(
  prisma: PrismaClient,
  users: User[],
  families: Family[],
  familyMembers: FamilyMember[]
): Promise<ReadinessAssessment[]> {
  console.log('Seeding Life Events and Readiness Assessments for Dashboard...');
  
  // 1. Seed LifeEvents templates (using upsert for idempotency)
  const defaultEvents = [
    {
      name: 'Driving License Application',
      normalizedKey: 'driving_license',
      description: 'Required documentation for applying for a driving license.',
      category: 'Government',
      expectedDocumentRules: ['identity', 'address'],
    },
    {
      name: 'Passport Renewal',
      normalizedKey: 'passport_renewal',
      description: 'Required documentation for renewing a passport.',
      category: 'Government',
      expectedDocumentRules: ['identity', 'address'],
    },
    {
      name: 'International Travel Visa',
      normalizedKey: 'travel_visa',
      description: 'Required documentation for international travel visa applications.',
      category: 'Travel',
      expectedDocumentRules: ['identity', 'address', 'travel', 'finance'],
    },
    {
      name: 'Higher Education Admission',
      normalizedKey: 'education_admission',
      description: 'Standard document collection for enrolling in college or university.',
      category: 'Education',
      expectedDocumentRules: ['identity', 'address', 'education'],
    },
    {
      name: 'Health Insurance Claim',
      normalizedKey: 'insurance_claim',
      description: 'Standard documentation required to file a health insurance claim.',
      category: 'Insurance',
      expectedDocumentRules: ['identity', 'insurance'],
    }
  ];

  const lifeEvents: LifeEvent[] = [];
  for (const event of defaultEvents) {
    const ev = await prisma.lifeEvent.upsert({
      where: { normalizedKey: event.normalizedKey },
      update: { name: event.name, description: event.description, category: event.category, expectedDocumentRules: event.expectedDocumentRules },
      create: { name: event.name, normalizedKey: event.normalizedKey, description: event.description, category: event.category, expectedDocumentRules: event.expectedDocumentRules, isActive: true },
    });
    lifeEvents.push(ev);
  }
  console.log(`✓ ${lifeEvents.length} Life Event Templates upserted.`);

  const assessments: ReadinessAssessment[] = [];

  // 2. Generate Readiness Assessments for families
  for (const family of families) {
    if (family.status === 'deleted') continue;

    const members = familyMembers.filter(m => m.familyId === family.id);
    if (members.length === 0) continue;

    // Pick family head or parents to be the assessable candidates
    const primaryCandidates = members.filter(m => m.relationship === 'head' || m.relationship === 'spouse');
    const assessMember = primaryCandidates.length > 0 ? primaryCandidates[0] : members[0];

    // Seed assessments for different events
    for (const event of lifeEvents) {
      // 70% probability of having an assessment for this event in a family
      if (faker.datatype.boolean(0.7)) {
        const monthsAgo = faker.number.int({ min: 1, max: 12 });
        const assessedAt = dateInLastMonths(monthsAgo);

        // Randomize status and scores
        const status = faker.helpers.arrayElement(['completed', 'pending', 'in_progress', 'failed']);
        
        let readinessScore = null;
        let readinessLevel = null;
        let availableDocs: string[] = [];
        let missingDocs: string[] = [];
        let mismatchWarnings: string[] = [];
        let expiryWarnings: string[] = [];
        let nextSteps = 'No action required.';
        let processSummary = 'System initialized.';

        if (status === 'completed') {
          readinessScore = faker.number.float({ min: 0.85, max: 1.0 });
          readinessLevel = readinessScore >= 0.95 ? 'ready' : 'high';
          availableDocs = event.expectedDocumentRules as string[];
          mismatchWarnings = [];
          expiryWarnings = [];
          nextSteps = 'Congratulations! Your files are verified and ready for submission.';
          processSummary = `All required documents (${availableDocs.join(', ')}) are available, verified, and active.`;
        } else if (status === 'in_progress' || status === 'pending') {
          readinessScore = faker.number.float({ min: 0.4, max: 0.8 });
          readinessLevel = readinessScore >= 0.65 ? 'medium' : 'low';
          
          const expectedRules = event.expectedDocumentRules as string[];
          availableDocs = [expectedRules[0]];
          missingDocs = expectedRules.slice(1);
          mismatchWarnings = faker.datatype.boolean(0.3) ? ['Slight spelling difference in full name'] : [];
          expiryWarnings = faker.datatype.boolean(0.2) ? ['Old ID card expires in 6 months'] : [];
          nextSteps = `Please upload the following missing document categories: ${missingDocs.join(', ')}.`;
          processSummary = `Analysis in progress. Found 1 of ${expectedRules.length} documents.`;
        } else {
          // failed status
          readinessScore = faker.number.float({ min: 0.0, max: 0.35 });
          readinessLevel = 'low';
          missingDocs = event.expectedDocumentRules as string[];
          mismatchWarnings = ['Missing primary Identity card.'];
          nextSteps = 'Please upload a valid high-resolution scan of your Identity Card.';
          processSummary = 'Assessment failed due to lack of required documentation.';
        }

        const assessment = await prisma.readinessAssessment.create({
          data: {
            familyId: family.id,
            familyMemberId: assessMember.id,
            lifeEventId: event.id,
            requestedByUserId: family.ownerUserId,
            status,
            readinessScore,
            readinessLevel,
            availableDocuments: availableDocs,
            missingDocuments: missingDocs,
            mismatchWarnings,
            expiryWarnings,
            nextSteps,
            processSummary,
            confidenceScore: readinessScore ? readinessScore * 0.98 : null,
            assessedAt,
            createdAt: assessedAt,
            updatedAt: assessedAt,
          },
        });
        assessments.push(assessment);
      }
    }
  }

  console.log(`✓ ${assessments.length} Readiness Assessments seeded.`);
  return assessments;
}
