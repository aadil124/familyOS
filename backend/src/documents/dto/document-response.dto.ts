import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentProcessingStatus } from '@prisma/client';

export class DocumentCategoryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  normalizedKey: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class DocumentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  familyId: string;

  @ApiPropertyOptional()
  familyMemberId?: string | null;

  @ApiPropertyOptional()
  categoryId?: string | null;

  @ApiPropertyOptional({ type: DocumentCategoryResponseDto })
  category?: DocumentCategoryResponseDto | null;

  @ApiProperty()
  originalFileName: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty()
  fileType: string;

  @ApiPropertyOptional()
  fileSize?: number | null;

  @ApiProperty()
  storageProvider: string;

  @ApiProperty()
  storageAssetId: string;

  @ApiPropertyOptional()
  storageUrlReference?: string | null;

  @ApiProperty()
  uploadStatus: string;

  @ApiProperty({ enum: DocumentProcessingStatus })
  processingStatus: DocumentProcessingStatus;

  @ApiProperty()
  reviewStatus: string;

  @ApiPropertyOptional()
  issueStatus?: string | null;

  @ApiPropertyOptional()
  issuedAt?: Date | null;

  @ApiPropertyOptional()
  expiresAt?: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
