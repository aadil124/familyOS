import { Module, OnModuleInit } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentsRepository } from './documents.repository';
import { CloudinaryService } from './cloudinary.service';
import { PrismaModule } from '../database/prisma.module';
import { FamilyModule } from '../family/family.module';
import { FamilyMemberModule } from '../family-member/family-member.module';

@Module({
  imports: [PrismaModule, FamilyModule, FamilyMemberModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentsRepository, CloudinaryService],
  exports: [DocumentsService, DocumentsRepository, CloudinaryService],
})
export class DocumentsModule implements OnModuleInit {
  constructor(private readonly documentsRepository: DocumentsRepository) {}

  async onModuleInit() {
    try {
      const existing = await this.documentsRepository.findManyCategories();
      if (existing.length === 0) {
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

        for (const cat of defaultCategories) {
          const existingCat = await this.documentsRepository.findCategoryByKey(cat.normalizedKey);
          if (!existingCat) {
            await this.documentsRepository.createCategory({
              name: cat.name,
              normalizedKey: cat.normalizedKey,
              description: cat.description,
              isActive: true,
            });
          }
        }
      }
    } catch (error) {
      // Gracefully catch errors during DB migrations or setup before tables exist
      console.warn('Skipping category seeding because DB setup is not complete yet:', error.message);
    }
  }
}
