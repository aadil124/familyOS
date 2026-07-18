import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LifeEventResponseDto } from './life-event-response.dto';

export class ReadinessAssessmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  familyId: string;

  @ApiPropertyOptional()
  familyMemberId?: string | null;

  @ApiProperty()
  lifeEventId: string;

  @ApiProperty()
  requestedByUserId: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  readinessScore?: number | null;

  @ApiPropertyOptional()
  readinessLevel?: string | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  availableDocuments?: any | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  missingDocuments?: any | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  mismatchWarnings?: any | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  expiryWarnings?: any | null;

  @ApiPropertyOptional()
  nextSteps?: string | null;

  @ApiPropertyOptional()
  processSummary?: string | null;

  @ApiPropertyOptional()
  confidenceScore?: number | null;

  @ApiPropertyOptional()
  failureReason?: string | null;

  @ApiProperty()
  assessedAt: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: () => LifeEventResponseDto })
  lifeEvent?: LifeEventResponseDto | null;
}
