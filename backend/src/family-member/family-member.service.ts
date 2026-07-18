import { Injectable, NotFoundException } from '@nestjs/common';
import { FamilyMemberRepository } from './family-member.repository';
import { FamilyRepository } from '../family/family.repository';
import { CreateFamilyMemberDto } from './dto/create-family-member.dto';
import { UpdateFamilyMemberDto } from './dto/update-family-member.dto';
import { FamilyMemberResponseDto } from './dto/family-member-response.dto';
import { FamilyMember } from '@prisma/client';

@Injectable()
export class FamilyMemberService {
  constructor(
    private readonly familyMemberRepository: FamilyMemberRepository,
    private readonly familyRepository: FamilyRepository,
  ) {}

  async createMember(
    familyId: string,
    createFamilyMemberDto: CreateFamilyMemberDto,
  ): Promise<FamilyMemberResponseDto> {
    const family = await this.familyRepository.findById(familyId);
    if (!family || family.deletedAt !== null) {
      throw new NotFoundException(`Family with ID "${familyId}" not found`);
    }

    const member = await this.familyMemberRepository.create({
      ...createFamilyMemberDto,
      familyId,
      status: 'active', // To satisfy Prisma required status field, status is initialized as 'active'
    });

    return this.mapToResponseDto(member);
  }

  async getMemberById(familyId: string, id: string): Promise<FamilyMemberResponseDto> {
    const member = await this.familyMemberRepository.findById(id);
    if (!member || member.deletedAt !== null || member.familyId !== familyId) {
      throw new NotFoundException(`Family member with ID "${id}" not found`);
    }
    return this.mapToResponseDto(member);
  }

  async getMembersByFamily(familyId: string): Promise<FamilyMemberResponseDto[]> {
    const family = await this.familyRepository.findById(familyId);
    if (!family || family.deletedAt !== null) {
      throw new NotFoundException(`Family with ID "${familyId}" not found`);
    }

    const members = await this.familyMemberRepository.findMany({
      where: {
        familyId,
        deletedAt: null,
      },
    });

    return members.map((m) => this.mapToResponseDto(m));
  }

  async updateMember(
    familyId: string,
    id: string,
    updateFamilyMemberDto: UpdateFamilyMemberDto,
  ): Promise<FamilyMemberResponseDto> {
    // Ensure active member exists and belongs to the specified family
    await this.getMemberById(familyId, id);

    const updatedMember = await this.familyMemberRepository.update(id, updateFamilyMemberDto);
    return this.mapToResponseDto(updatedMember);
  }

  async deleteMember(familyId: string, id: string): Promise<void> {
    // Ensure active member exists and belongs to the specified family
    await this.getMemberById(familyId, id);

    await this.familyMemberRepository.softDelete(id);
  }

  private mapToResponseDto(member: FamilyMember): FamilyMemberResponseDto {
    return {
      id: member.id,
      familyId: member.familyId,
      fullName: member.fullName,
      relationship: member.relationship,
      dateOfBirth: member.dateOfBirth,
      primaryEmail: member.primaryEmail,
      primaryPhone: member.primaryPhone,
      status: member.status,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
    };
  }
}
