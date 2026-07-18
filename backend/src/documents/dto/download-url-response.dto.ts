import { ApiProperty } from '@nestjs/swagger';

export class DownloadUrlResponseDto {
  @ApiProperty({ description: 'The secure timed URL to download or view the asset' })
  url: string;

  @ApiProperty({ description: 'Expiration duration of the URL in seconds' })
  expiresIn: number;
}
