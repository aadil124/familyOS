import { Module } from '@nestjs/common';
import { FamilyService } from './family.service';
import { FamilyRepository } from './family.repository';
import { FamilyController } from './family.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [FamilyController],
  providers: [FamilyService, FamilyRepository],
  exports: [FamilyService, FamilyRepository],
})
export class FamilyModule {}
