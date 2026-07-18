import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class UpdateFamilyDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(100)
  name?: string;
}
