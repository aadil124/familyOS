import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConversationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  familyId: string;

  @ApiProperty()
  userId: string;

  @ApiPropertyOptional()
  title?: string | null;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  lastMessageAt?: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
