import { Module } from '@nestjs/common';
import { FamilyMemberService } from './family-member.service';
import { FamilyMemberRepository } from './family-member.repository';
import { FamilyModule } from '../family/family.module';

@Module({
  imports: [FamilyModule],
  providers: [FamilyMemberService, FamilyMemberRepository],
  exports: [FamilyMemberService, FamilyMemberRepository],
})
export class FamilyMemberModule {}
