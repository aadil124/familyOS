import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDocumentDto {
  @ApiPropertyOptional({ description: 'New display name for the document' })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({ description: 'Updated family member ID, or null to unassign' })
  @IsUUID()
  @IsOptional()
  familyMemberId?: string;

  @ApiPropertyOptional({ description: 'Updated category ID, or null to unclassify' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;
}
