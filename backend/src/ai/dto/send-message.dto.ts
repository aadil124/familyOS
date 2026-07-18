import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ description: 'The message text content' })
  @IsNotEmpty()
  @IsString()
  content: string;
}
