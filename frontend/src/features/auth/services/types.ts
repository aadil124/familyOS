export interface AuthUserResponseDto {
  id: string;
  fullName: string;
  email: string;
}

export interface LoginResponseDto {
  user: AuthUserResponseDto;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterResponseDto {
  user: AuthUserResponseDto;
  accessToken: string;
  refreshToken: string;
}

export interface TokenPairResponseDto {
  accessToken: string;
  refreshToken: string;
}

export interface UserResponseDto {
  id: string;
  fullName: string;
  email: string;
  status: string;
  emailVerifiedAt?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface ApiErrorResponse {
  success: boolean;
  statusCode: number;
  timestamp: string;
  path: string;
  message: string;
}
