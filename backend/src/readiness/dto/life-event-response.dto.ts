import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LifeEventResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  normalizedKey: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  category?: string | null;

  @ApiPropertyOptional()
  expectedDocumentRules?: any | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
