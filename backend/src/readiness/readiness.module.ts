import { Module, OnModuleInit } from '@nestjs/common';
import { LifeEventController, ReadinessController } from './readiness.controller';
import { ReadinessService } from './readiness.service';
import { ReadinessRepository } from './readiness.repository';
import { PrismaModule } from '../database/prisma.module';
import { FamilyModule } from '../family/family.module';
import { FamilyMemberModule } from '../family-member/family-member.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [
    PrismaModule,
    FamilyModule,
    FamilyMemberModule,
    DocumentsModule,
  ],
  controllers: [LifeEventController, ReadinessController],
  providers: [ReadinessService, ReadinessRepository],
  exports: [ReadinessService, ReadinessRepository],
})
export class ReadinessModule implements OnModuleInit {
  constructor(private readonly readinessRepository: ReadinessRepository) {}

  async onModuleInit() {
    try {
      const existing = await this.readinessRepository.findManyEvents();
      if (existing.length === 0) {
        const defaultEvents = [
          {
            name: 'Driving License Application',
            normalizedKey: 'driving_license',
            description: 'Required documentation for applying for a driving license.',
            category: 'Government',
            expectedDocumentRules: ['identity', 'address'],
            isActive: true,
          },
          {
            name: 'Passport Renewal',
            normalizedKey: 'passport_renewal',
            description: 'Required documentation for renewing a passport.',
            category: 'Government',
            expectedDocumentRules: ['identity', 'address'],
            isActive: true,
          },
        ];

        for (const event of defaultEvents) {
          const existingEvent = await this.readinessRepository.findEventByKey(event.normalizedKey);
          if (!existingEvent) {
            await this.readinessRepository.createEvent(event);
          }
        }
      }
    } catch (error) {
      console.warn('Skipping LifeEvent seeding because DB setup or migration is not complete yet:', error.message);
    }
  }
}
