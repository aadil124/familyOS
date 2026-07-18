import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OCRStatus } from '@prisma/client';

export class OcrResultResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  documentId: string;

  @ApiProperty()
  provider: string;

  @ApiProperty()
  providerVersion: string;

  @ApiProperty({ enum: OCRStatus })
  status: OCRStatus;

  @ApiPropertyOptional()
  extractedText?: string | null;

  @ApiPropertyOptional()
  confidenceScore?: number | null;

  @ApiPropertyOptional()
  failureReason?: string | null;

  @ApiPropertyOptional()
  processedAt?: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
