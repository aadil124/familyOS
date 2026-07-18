import { ApiProperty } from '@nestjs/swagger';

export class AuthUserResponseDto {
  @ApiProperty({ example: 'uuid-string-1234', description: 'User unique ID' })
  id!: string;

  @ApiProperty({ example: 'John Doe', description: 'User full display name' })
  fullName!: string;

  @ApiProperty({ example: 'john@example.com', description: 'User unique email address' })
  email!: string;
}

export class LoginResponseDto {
  @ApiProperty({ type: AuthUserResponseDto })
  user!: AuthUserResponseDto;

  @ApiProperty({ example: 'eyJhbGci...', description: 'JWT Access Token' })
  accessToken!: string;

  @ApiProperty({ example: 'def456...', description: 'JWT Refresh Token' })
  refreshToken!: string;
}

export class RegisterResponseDto {
  @ApiProperty({ type: AuthUserResponseDto })
  user!: AuthUserResponseDto;

  @ApiProperty({ example: 'eyJhbGci...', description: 'JWT Access Token' })
  accessToken!: string;

  @ApiProperty({ example: 'def456...', description: 'JWT Refresh Token' })
  refreshToken!: string;
}

export class TokenPairResponseDto {
  @ApiProperty({ example: 'eyJhbGci...', description: 'JWT Access Token' })
  accessToken!: string;

  @ApiProperty({ example: 'def456...', description: 'JWT Refresh Token' })
  refreshToken!: string;
}
