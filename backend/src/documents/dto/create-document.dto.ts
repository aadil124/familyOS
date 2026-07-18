import { IsString, IsNotEmpty, IsOptional, IsInt, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDocumentDto {
  @ApiProperty({ description: 'The asset identifier returned by the storage provider' })
  @IsString()
  @IsNotEmpty()
  storageAssetId: string;

  @ApiProperty({ description: 'The original name of the uploaded file' })
  @IsString()
  @IsNotEmpty()
  originalFileName: string;

  @ApiProperty({ description: 'The format or file extension of the file' })
  @IsString()
  @IsNotEmpty()
  fileType: string;

  @ApiPropertyOptional({ description: 'File size in bytes' })
  @IsInt()
  @IsOptional()
  fileSize?: number;

  @ApiPropertyOptional({ description: 'User-defined display name for the document' })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({ description: 'Associated family member ID, if applicable' })
  @IsUUID()
  @IsOptional()
  familyMemberId?: string;

  @ApiPropertyOptional({ description: 'Associated document category ID, if applicable' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;
}
