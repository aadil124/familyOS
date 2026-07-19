import { PrismaClient, User, Family, FamilyMember, DocumentCategory, Document, DocumentProcessingStatus, DocumentReviewStatus, OCRStatus, AnalysisStatus } from '@prisma/client';
import { dateInLastMonths, randomDate } from './utils';
import { faker } from '@faker-js/faker';

export async function seedExpenses(
  prisma: PrismaClient,
  users: User[],
  families: Family[],
  familyMembers: FamilyMember[],
  categories: DocumentCategory[]
): Promise<void> {
  console.log('Seeding Expenses (as financial documents)...');
  let expenseCount = 0;

  const categoryMap = new Map(categories.map(c => [c.normalizedKey, c.id]));
  const financeCatId = categoryMap.get('finance');
  const travelCatId = categoryMap.get('travel');
  const eduCatId = categoryMap.get('education');
  const insCatId = categoryMap.get('insurance');

  if (!financeCatId) return;

  const expenseTemplates = [
    { name: 'Grocery Receipt - Whole Foods', catId: financeCatId, baseAmt: 150, type: 'Groceries' },
    { name: 'Electricity Utility Bill', catId: financeCatId, baseAmt: 80, type: 'Utilities' },
    { name: 'Water & Sewage Utility Bill', catId: financeCatId, baseAmt: 40, type: 'Utilities' },
    { name: 'College Tuition Fee Receipt', catId: eduCatId, baseAmt: 3500, type: 'Education' },
    { name: 'Flight Ticket - Summer Vacation', catId: travelCatId, baseAmt: 450, type: 'Travel' },
    { name: 'Dental Checkup Invoice', catId: insCatId, baseAmt: 120, type: 'Health' },
    { name: 'Pharmacy Medicine Purchase', catId: insCatId, baseAmt: 45, type: 'Health' },
  ];

  for (const family of families) {
    if (family.status === 'deleted') continue;

    const members = familyMembers.filter(m => m.familyId === family.id);
    if (members.length === 0) continue;

    // Seed 8-12 expense documents spread across the last 24 months
    const count = faker.number.int({ min: 8, max: 12 });
    
    for (let j = 0; j < count; j++) {
      const template = faker.helpers.arrayElement(expenseTemplates);
      const member = faker.helpers.arrayElement(members);
      const monthsAgo = faker.number.int({ min: 1, max: 24 });
      const recordDate = dateInLastMonths(monthsAgo);

      // Generate a realistic amount
      const amount = (template.baseAmt * faker.number.float({ min: 0.8, max: 1.5 })).toFixed(2);
      const invoiceNo = faker.string.alphanumeric({ length: 8, casing: 'upper' });

      const document = await prisma.document.create({
        data: {
          familyId: family.id,
          familyMemberId: member.id,
          categoryId: template.catId,
          originalFileName: `${template.name.toLowerCase().replace(/ /g, '_')}_${invoiceNo}.pdf`,
          displayName: `${template.name} (${recordDate.toLocaleString('default', { month: 'short' })} ${recordDate.getFullYear()})`,
          fileType: 'pdf',
          fileSize: faker.number.int({ min: 50000, max: 500000 }),
          storageProvider: 'cloudinary',
          storageAssetId: `cloudinary-asset-${faker.string.uuid()}`,
          storageUrlReference: `https://res.cloudinary.com/familyos/image/upload/v1720000000/expense_${invoiceNo}.pdf`,
          uploadStatus: 'success',
          issueStatus: 'issued',
          issuedAt: recordDate,
          processingStatus: DocumentProcessingStatus.SUCCESS,
          reviewStatus: DocumentReviewStatus.REVIEWED,
          createdAt: recordDate,
          updatedAt: recordDate,
        },
      });

      // Seed OCRResult for invoice extraction
      await prisma.oCRResult.create({
        data: {
          documentId: document.id,
          provider: 'google-vision',
          providerVersion: 'v1.2',
          status: OCRStatus.COMPLETED,
          extractedText: `INVOICE: ${invoiceNo}\nMERCHANT: ${template.name}\nTOTAL AMOUNT: $${amount}\nDATE: ${recordDate.toLocaleDateString()}`,
          confidenceScore: 0.95,
          processedAt: recordDate,
          createdAt: recordDate,
          updatedAt: recordDate,
        },
      });

      // Seed DocumentAnalysis for structured fields (like amount, type, date)
      await prisma.documentAnalysis.create({
        data: {
          documentId: document.id,
          provider: 'openai-gpt-4o',
          providerVersion: '2024-05-13',
          status: AnalysisStatus.COMPLETED,
          detectedDocumentType: 'Receipt/Invoice',
          extractedFields: {
            invoiceNumber: invoiceNo,
            merchant: template.name,
            totalAmount: parseFloat(amount),
            currency: 'USD',
            expenseType: template.type,
            transactionDate: recordDate,
          },
          nameOnDocument: member.fullName,
          confidenceScore: 0.96,
          analysisSummary: `Financial audit analysis: Extracted expense of $${amount} for ${template.type}. Verified matching name ${member.fullName}.`,
          analyzedAt: recordDate,
          createdAt: recordDate,
          updatedAt: recordDate,
        },
      });

      expenseCount++;
    }
  }

  console.log(`✓ ${expenseCount} Expenses (as invoices/documents) seeded.`);
}
