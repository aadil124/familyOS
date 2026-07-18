import { Module } from '@nestjs/common';
import { FamilyMemberService } from './family-member.service';
import { FamilyMemberRepository } from './family-member.repository';
import { FamilyMemberController } from './family-member.controller';
import { FamilyModule } from '../family/family.module';

@Module({
  imports: [FamilyModule],
  controllers: [FamilyMemberController],
  providers: [FamilyMemberService, FamilyMemberRepository],
  exports: [FamilyMemberService, FamilyMemberRepository],
})
export class FamilyMemberModule {}
