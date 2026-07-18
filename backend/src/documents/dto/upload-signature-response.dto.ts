import { ApiProperty } from '@nestjs/swagger';

export class UploadSignatureResponseDto {
  @ApiProperty({ description: 'The generated cryptographic signature for direct upload' })
  signature: string;

  @ApiProperty({ description: 'The Unix timestamp in seconds corresponding to signature generation' })
  timestamp: number;

  @ApiProperty({ description: 'The storage directory path where the asset will be saved' })
  folder: string;

  @ApiProperty({ description: 'The asset access control type (e.g. authenticated)' })
  type: string;

  @ApiProperty({ description: 'The Cloudinary API Key' })
  apiKey: string;

  @ApiProperty({ description: 'The Cloudinary Cloud Name' })
  cloudName: string;
}
