import { PrismaClient, Family, FamilyMember, Document, DocumentCategory, DocumentProcessingStatus, DocumentReviewStatus, OCRStatus, AnalysisStatus } from '@prisma/client';
import { dateInLastMonths, randomDate } from './utils';
import { faker } from '@faker-js/faker';

export async function seedDocuments(
  prisma: PrismaClient,
  families: Family[],
  familyMembers: FamilyMember[]
): Promise<{ categories: DocumentCategory[]; documents: Document[] }> {
  console.log('Seeding Document Categories and Documents...');

  // 1. Seed Categories (using upsert for idempotency)
  const defaultCategories = [
    {
      name: 'Identity Verification',
      normalizedKey: 'identity',
      description: 'Passports, National ID Cards, Drivers Licenses',
    },
    {
      name: 'Proof of Address',
      normalizedKey: 'address',
      description: 'Utility bills, tenancy agreements, bank statements',
    },
    {
      name: 'Travel Documents',
      normalizedKey: 'travel',
      description: 'Visas, tickets, boarding passes, itineraries',
    },
    {
      name: 'Education & Credentials',
      normalizedKey: 'education',
      description: 'Diplomas, degrees, certifications, transcripts',
    },
    {
      name: 'Finance & Taxes',
      normalizedKey: 'finance',
      description: 'Tax returns, payslips, investment statements',
    },
    {
      name: 'Insurance Policies',
      normalizedKey: 'insurance',
      description: 'Health, life, auto, home insurance documents',
    },
    {
      name: 'Government Records',
      normalizedKey: 'government',
      description: 'Social security cards, birth certificates, marriage certificates',
    },
  ];

  const categories: DocumentCategory[] = [];
  for (const cat of defaultCategories) {
    const c = await prisma.documentCategory.upsert({
      where: { normalizedKey: cat.normalizedKey },
      update: { name: cat.name, description: cat.description },
      create: { name: cat.name, normalizedKey: cat.normalizedKey, description: cat.description, isActive: true },
    });
    categories.push(c);
  }
  console.log(`✓ ${categories.length} Document Categories upserted.`);

  const documents: Document[] = [];

  const categoryMap = new Map(categories.map(c => [c.normalizedKey, c.id]));

  // 2. Generate Documents for Family Members
  for (const member of familyMembers) {
    if (member.status === 'deleted') continue;

    const lastName = member.fullName.split(' ')[1] || faker.person.lastName();
    const family = families.find(f => f.id === member.familyId);
    if (!family) continue;

    // Document types to seed
    const docConfigs = [
      {
        displayName: 'Aadhaar Card',
        fileName: 'aadhaar_card.pdf',
        fileType: 'pdf',
        catKey: 'identity',
        number: () => faker.string.numeric(12),
        docType: 'Aadhaar Card',
        fields: (num: string) => ({ aadhaarNumber: num, name: member.fullName, dob: member.dateOfBirth }),
      },
      {
        displayName: 'PAN Card',
        fileName: 'pan_card.jpg',
        fileType: 'jpg',
        catKey: 'identity',
        number: () => faker.string.alphanumeric({ length: 10, casing: 'upper' }),
        docType: 'PAN Card',
        fields: (num: string) => ({ panNumber: num, name: member.fullName, fatherName: `Late Mr. ${lastName}` }),
      },
      {
        displayName: 'Passport',
        fileName: 'passport.pdf',
        fileType: 'pdf',
        catKey: 'travel',
        number: () => faker.string.alphanumeric({ length: 8, casing: 'upper' }),
        docType: 'Passport',
        fields: (num: string) => ({ passportNumber: num, name: member.fullName, nationality: 'Indian' }),
      },
      {
        displayName: 'Driving License',
        fileName: 'driving_license.pdf',
        fileType: 'pdf',
        catKey: 'identity',
        number: () => faker.string.alphanumeric({ length: 15, casing: 'upper' }),
        docType: 'Driving License',
        fields: (num: string) => ({ licenseNumber: num, name: member.fullName, allowedVehicles: 'MCWG, LMV' }),
      },
    ];

    // Seed 2-4 successful documents per active family member
    const seededDocsCount = faker.number.int({ min: 2, max: 4 });
    const selectedConfigs = faker.helpers.arrayElements(docConfigs, seededDocsCount);

    for (const config of selectedConfigs) {
      const docNo = config.number();
      const createdAt = dateInLastMonths(12);

      const document = await prisma.document.create({
        data: {
          familyId: member.familyId,
          familyMemberId: member.id,
          categoryId: categoryMap.get(config.catKey),
          originalFileName: config.fileName,
          displayName: config.displayName,
          fileType: config.fileType,
          fileSize: faker.number.int({ min: 50000, max: 2500000 }),
          storageProvider: 'cloudinary',
          storageAssetId: `cloudinary-asset-${faker.string.uuid()}`,
          storageUrlReference: config.fileType === 'jpg' ? 'https://picsum.photos/400' : `https://res.cloudinary.com/familyos/image/upload/v1720000000/${config.fileName}`,
          uploadStatus: 'success',
          issueStatus: 'issued',
          issuedAt: dateInLastMonths(24),
          expiresAt: randomDate(new Date(2026, 0, 1), new Date(2035, 11, 31)),
          processingStatus: DocumentProcessingStatus.SUCCESS,
          reviewStatus: faker.helpers.arrayElement([
            DocumentReviewStatus.UNREVIEWED,
            DocumentReviewStatus.PENDING_REVIEW,
            DocumentReviewStatus.REVIEWED,
            DocumentReviewStatus.USER_VERIFIED,
          ]),
          createdAt,
          updatedAt: createdAt,
        },
      });
      documents.push(document);

      // Seed OCRResult
      await prisma.oCRResult.create({
        data: {
          documentId: document.id,
          provider: 'google-vision',
          providerVersion: 'v1.2',
          status: OCRStatus.COMPLETED,
          extractedText: `GOVERNMENT OF INDIA\nDOCUMENT TYPE: ${config.docType}\nNUMBER: ${docNo}\nNAME: ${member.fullName}\nSTATUS: VALID`,
          confidenceScore: faker.number.float({ min: 0.85, max: 0.99 }),
          processedAt: createdAt,
          createdAt,
          updatedAt: createdAt,
        },
      });

      // Seed DocumentAnalysis
      await prisma.documentAnalysis.create({
        data: {
          documentId: document.id,
          provider: 'openai-gpt-4o',
          providerVersion: '2024-05-13',
          status: AnalysisStatus.COMPLETED,
          detectedDocumentType: config.docType,
          extractedFields: config.fields(docNo),
          nameOnDocument: member.fullName,
          confidenceScore: faker.number.float({ min: 0.9, max: 0.99 }),
          analysisSummary: `Verified ${config.displayName} for ${member.fullName}. Document number is ${docNo}. All fields extracted successfully.`,
          analyzedAt: createdAt,
          createdAt,
          updatedAt: createdAt,
        },
      });
    }

    // Seed 1 Pending Upload document for some members
    if (faker.datatype.boolean(0.3)) {
      const pendingDoc = await prisma.document.create({
        data: {
          familyId: member.familyId,
          familyMemberId: member.id,
          categoryId: categoryMap.get('identity'),
          originalFileName: 'pending_id_card.pdf',
          displayName: 'Verification Pending Card',
          fileType: 'pdf',
          fileSize: 45000,
          storageProvider: 'cloudinary',
          storageAssetId: `cloudinary-asset-${faker.string.uuid()}`,
          uploadStatus: 'pending',
          processingStatus: DocumentProcessingStatus.PENDING,
          reviewStatus: DocumentReviewStatus.UNREVIEWED,
          createdAt: dateInLastMonths(1),
          updatedAt: dateInLastMonths(1),
        },
      });
      documents.push(pendingDoc);
    }

    // Seed 1 Failed document for some members to cover status ranges
    if (faker.datatype.boolean(0.2)) {
      const failedDoc = await prisma.document.create({
        data: {
          familyId: member.familyId,
          familyMemberId: member.id,
          categoryId: categoryMap.get('identity'),
          originalFileName: 'blurry_image.jpg',
          displayName: 'Blurry National ID Scan',
          fileType: 'jpg',
          fileSize: 120000,
          storageProvider: 'cloudinary',
          storageAssetId: `cloudinary-asset-${faker.string.uuid()}`,
          storageUrlReference: 'https://picsum.photos/400',
          uploadStatus: 'success',
          processingStatus: DocumentProcessingStatus.FAILED,
          reviewStatus: DocumentReviewStatus.UNREVIEWED,
          createdAt: dateInLastMonths(2),
          updatedAt: dateInLastMonths(2),
        },
      });
      documents.push(failedDoc);

      // Seed OCRResult as failed
      await prisma.oCRResult.create({
        data: {
          documentId: failedDoc.id,
          provider: 'google-vision',
          providerVersion: 'v1.2',
          status: OCRStatus.FAILED,
          failureReason: 'Image is too blurry to extract text',
          processedAt: dateInLastMonths(2),
          createdAt: dateInLastMonths(2),
          updatedAt: dateInLastMonths(2),
        },
      });

      // Seed DocumentAnalysis as failed
      await prisma.documentAnalysis.create({
        data: {
          documentId: failedDoc.id,
          provider: 'openai-gpt-4o',
          providerVersion: '2024-05-13',
          status: AnalysisStatus.FAILED,
          failureReason: 'Missing or corrupt OCR data',
          createdAt: dateInLastMonths(2),
          updatedAt: dateInLastMonths(2),
        },
      });
    }
  }

  console.log(`✓ ${documents.length} Documents seeded (with OCR and Analyses).`);
  return { categories, documents };
}
