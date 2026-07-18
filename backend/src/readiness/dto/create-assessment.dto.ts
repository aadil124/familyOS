import { IsUUID, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReadinessAssessmentDto {
  @ApiProperty({ description: 'The identifier of the life event rule scenario' })
  @IsUUID()
  @IsNotEmpty()
  lifeEventId: string;

  @ApiPropertyOptional({ description: 'The identifier of the target family member, if member-specific' })
  @IsUUID()
  @IsOptional()
  familyMemberId?: string;
}
