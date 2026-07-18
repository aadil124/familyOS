import { Module } from '@nestjs/common';
import { FamilyService } from './family.service';
import { FamilyRepository } from './family.repository';

@Module({
  providers: [FamilyService, FamilyRepository],
  exports: [FamilyService, FamilyRepository],
})
export class FamilyModule {}
