import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnalysisStatus } from '@prisma/client';

export class AiAnalysisResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  documentId: string;

  @ApiProperty()
  provider: string;

  @ApiProperty()
  providerVersion: string;

  @ApiProperty({ enum: AnalysisStatus })
  status: AnalysisStatus;

  @ApiPropertyOptional()
  detectedDocumentType?: string | null;

  @ApiPropertyOptional()
  extractedFields?: any;

  @ApiPropertyOptional()
  nameOnDocument?: string | null;

  @ApiPropertyOptional()
  addressOnDocument?: string | null;

  @ApiPropertyOptional()
  issuedDate?: string | null;

  @ApiPropertyOptional()
  expiryDate?: string | null;

  @ApiPropertyOptional()
  confidenceScore?: number | null;

  @ApiPropertyOptional()
  mismatchFlags?: any;

  @ApiPropertyOptional()
  analysisSummary?: string | null;

  @ApiPropertyOptional()
  analyzedAt?: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
