import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  familyId: string;

  @ApiPropertyOptional()
  relatedDocumentId?: string | null;

  @ApiPropertyOptional()
  relatedFamilyMemberId?: string | null;

  @ApiPropertyOptional()
  relatedAssessmentId?: string | null;

  @ApiProperty()
  type: string;

  @ApiProperty()
  severity: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  actionLabel?: string | null;

  @ApiPropertyOptional()
  actionReference?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  readAt?: Date | null;

  @ApiPropertyOptional()
  dismissedAt?: Date | null;

  @ApiPropertyOptional()
  expiresAt?: Date | null;
}
