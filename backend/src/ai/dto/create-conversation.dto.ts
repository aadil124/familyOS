import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class CreateConversationDto {
  @ApiPropertyOptional({ description: 'Optional custom title for the conversation' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;
}
