import { PrismaClient, User, Family, FamilyMember, DocumentCategory, DocumentProcessingStatus, DocumentReviewStatus, OCRStatus, AnalysisStatus } from '@prisma/client';
import { dateInLastMonths, randomDate } from './utils';
import { faker } from '@faker-js/faker';

export async function seedMedical(
  prisma: PrismaClient,
  users: User[],
  families: Family[],
  familyMembers: FamilyMember[],
  categories: DocumentCategory[]
): Promise<void> {
  console.log('Seeding Medical Data (as health documents and notifications)...');
  let medicalDocsCount = 0;
  let medicalRemindersCount = 0;

  const categoryMap = new Map(categories.map(c => [c.normalizedKey, c.id]));
  const insCatId = categoryMap.get('insurance');
  const govCatId = categoryMap.get('government');

  if (!insCatId || !govCatId) return;

  const medicalTemplates = [
    { name: 'Pediatric Vaccination Certificate', catId: govCatId, type: 'Vaccination', fields: () => ({ vaccine: 'MMR, DTaP, Polio', clinic: 'City Health Clinic' }) },
    { name: 'COVID-19 Booster Card', catId: govCatId, type: 'Vaccination', fields: () => ({ vaccine: 'Pfizer-BioNTech', dose: '3rd Dose' }) },
    { name: 'Physician Health Prescription', catId: insCatId, type: 'Prescription', fields: () => ({ medication: 'Lisinopril 10mg', doctor: 'Dr. Sarah Connor' }) },
    { name: 'Dental Checkup Summary', catId: insCatId, type: 'Consultation', fields: () => ({ diagnosis: 'Routine Cleaning & Polish', dentist: 'Dr. John Watson' }) },
    { name: 'Ophthalmology Eye Exam & Specs prescription', catId: insCatId, type: 'Prescription', fields: () => ({ sphereRight: -1.75, sphereLeft: -1.50, doctor: 'Dr. James Cole' }) },
  ];

  for (const family of families) {
    if (family.status === 'deleted') continue;

    const members = familyMembers.filter(m => m.familyId === family.id);
    if (members.length === 0) continue;

    // 1. Seed 3-5 medical documents per family
    const docCount = faker.number.int({ min: 3, max: 5 });
    for (let i = 0; i < docCount; i++) {
      const template = faker.helpers.arrayElement(medicalTemplates);
      const member = faker.helpers.arrayElement(members);
      const recordDate = dateInLastMonths(18);
      const fileNo = faker.string.alphanumeric({ length: 6, casing: 'upper' });

      const document = await prisma.document.create({
        data: {
          familyId: family.id,
          familyMemberId: member.id,
          categoryId: template.catId,
          originalFileName: `${template.name.toLowerCase().replace(/ /g, '_')}_${fileNo}.pdf`,
          displayName: `${template.name} - ${member.fullName.split(' ')[0]}`,
          fileType: 'pdf',
          fileSize: faker.number.int({ min: 100000, max: 800000 }),
          storageProvider: 'cloudinary',
          storageAssetId: `cloudinary-asset-${faker.string.uuid()}`,
          storageUrlReference: `https://res.cloudinary.com/familyos/image/upload/v1720000000/medical_${fileNo}.pdf`,
          uploadStatus: 'success',
          issueStatus: 'issued',
          issuedAt: recordDate,
          processingStatus: DocumentProcessingStatus.SUCCESS,
          reviewStatus: DocumentReviewStatus.REVIEWED,
          createdAt: recordDate,
          updatedAt: recordDate,
        },
      });

      // Seed OCRResult
      await prisma.oCRResult.create({
        data: {
          documentId: document.id,
          provider: 'google-vision',
          providerVersion: 'v1.2',
          status: OCRStatus.COMPLETED,
          extractedText: `HEALTH RECORD\nPATIENT NAME: ${member.fullName}\nRECORD TYPE: ${template.type}\nTITLE: ${template.name}\nDATE: ${recordDate.toLocaleDateString()}`,
          confidenceScore: 0.94,
          processedAt: recordDate,
          createdAt: recordDate,
          updatedAt: recordDate,
        },
      });

      // Seed DocumentAnalysis
      await prisma.documentAnalysis.create({
        data: {
          documentId: document.id,
          provider: 'openai-gpt-4o',
          providerVersion: '2024-05-13',
          status: AnalysisStatus.COMPLETED,
          detectedDocumentType: `Medical ${template.type}`,
          extractedFields: {
            patientName: member.fullName,
            medicalRecordType: template.type,
            details: template.fields(),
            dateOfService: recordDate,
          },
          nameOnDocument: member.fullName,
          confidenceScore: 0.95,
          analysisSummary: `Medical verification: Confirmed patient ${member.fullName} for ${template.type}. Verified clinic information.`,
          analyzedAt: recordDate,
          createdAt: recordDate,
          updatedAt: recordDate,
        },
      });

      medicalDocsCount++;
    }

    // 2. Seed 2 upcoming medical checkups or reminders as notifications
    for (const member of members) {
      if (faker.datatype.boolean(0.4)) {
        const reminderDate = new Date();
        reminderDate.setDate(reminderDate.getDate() + faker.number.int({ min: 5, max: 60 }));

        await prisma.notification.create({
          data: {
            userId: family.ownerUserId,
            familyId: family.id,
            relatedFamilyMemberId: member.id,
            type: 'health_reminder',
            severity: 'info',
            title: `Medical Checkup: ${member.fullName}`,
            message: `Scheduled vaccination / routine health visit for ${member.fullName} at Green Valley Clinic. Date: ${reminderDate.toLocaleDateString()}`,
            status: 'unread',
            actionLabel: 'View Clinic Info',
            actionReference: `/family/member/${member.id}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        medicalRemindersCount++;
      }
    }
  }

  console.log(`✓ ${medicalDocsCount} Medical Documents and ${medicalRemindersCount} Health Reminders seeded.`);
}
