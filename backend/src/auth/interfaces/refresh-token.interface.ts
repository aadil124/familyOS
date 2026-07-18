export interface RefreshTokenAttributes {
  id: string;
  userId: string;
  tokenHash: string;
  status: string;
  issuedAt: Date;
  expiresAt: Date;
  revokedAt?: Date | null;
  replacedByTokenId?: string | null;
  deviceLabel?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefreshTokenCreateInput {
  userId: string;
  tokenHash: string;
  status: string;
  expiresAt: Date;
  deviceLabel?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface RefreshTokenUpdateInput {
  status?: string;
  revokedAt?: Date | null;
  replacedByTokenId?: string | null;
}
