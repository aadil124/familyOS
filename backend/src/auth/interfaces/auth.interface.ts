import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  [key: string]: any;
}

export interface CurrentUser {
  userId: string;
  email: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user: CurrentUser;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
