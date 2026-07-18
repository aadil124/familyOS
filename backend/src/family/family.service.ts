import { Injectable, NotFoundException } from '@nestjs/common';
import { FamilyRepository } from './family.repository';
import { CreateFamilyDto } from './dto/create-family.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';
import { FamilyResponseDto } from './dto/family-response.dto';
import { Family } from '@prisma/client';

@Injectable()
export class FamilyService {
  constructor(private readonly familyRepository: FamilyRepository) {}

  async createFamily(ownerUserId: string, name: string): Promise<FamilyResponseDto> {
    const family = await this.familyRepository.create({
      ownerUserId,
      name,
      status: 'active', // Set standard placeholder status to satisfy Prisma schema required field
    });
    return this.mapToResponseDto(family);
  }

  async getFamilyById(id: string): Promise<FamilyResponseDto> {
    const family = await this.familyRepository.findById(id);
    if (!family || family.deletedAt !== null) {
      throw new NotFoundException(`Family with ID "${id}" not found`);
    }
    return this.mapToResponseDto(family);
  }

  async getFamiliesByOwner(ownerUserId: string): Promise<FamilyResponseDto[]> {
    const families = await this.familyRepository.findMany({
      where: {
        ownerUserId,
        deletedAt: null,
      },
    });
    return families.map((family) => this.mapToResponseDto(family));
  }

  async updateFamily(id: string, updateFamilyDto: UpdateFamilyDto): Promise<FamilyResponseDto> {
    // Ensure the family exists and is not soft-deleted
    await this.getFamilyById(id);

    const updatedFamily = await this.familyRepository.update(id, updateFamilyDto);
    return this.mapToResponseDto(updatedFamily);
  }

  async deleteFamily(id: string): Promise<void> {
    // Ensure the family exists and is not soft-deleted
    await this.getFamilyById(id);

    await this.familyRepository.softDelete(id);
  }

  private mapToResponseDto(family: Family): FamilyResponseDto {
    return {
      id: family.id,
      ownerUserId: family.ownerUserId,
      name: family.name,
      createdAt: family.createdAt,
      updatedAt: family.updatedAt,
    };
  }
}
