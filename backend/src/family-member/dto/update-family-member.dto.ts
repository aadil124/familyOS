import { IsString, IsNotEmpty, IsOptional, IsEmail, IsDate, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateFamilyMemberDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(100)
  fullName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  relationship?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  dateOfBirth?: Date;

  @IsEmail()
  @IsOptional()
  primaryEmail?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  primaryPhone?: string;
}
