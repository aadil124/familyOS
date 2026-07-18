import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MessageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  conversationId: string;

  @ApiProperty()
  role: string;

  @ApiProperty()
  content: string;

  @ApiPropertyOptional()
  safetyStatus?: string | null;

  @ApiProperty()
  createdAt: Date;
}
