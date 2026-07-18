import { IsEmail, IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'john.doe@example.com' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsString({ message: 'First name must be a string' })
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsString({ message: 'Last name must be a string' })
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ example: 'active', enum: ['active', 'suspended', 'deleted'] })
  @IsString({ message: 'Status must be a string' })
  @IsIn(['active', 'suspended', 'deleted'], { message: 'Status must be active, suspended, or deleted' })
  @IsOptional()
  status?: string;
}
