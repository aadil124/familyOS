export interface UserAttributes {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  status: string;
  emailVerifiedAt?: Date | null;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface UserCreateInput {
  fullName: string;
  email: string;
  passwordHash: string;
  status: string;
}

export interface UserUpdateInput {
  fullName?: string;
  email?: string;
  passwordHash?: string;
  status?: string;
  lastLoginAt?: Date | null;
  emailVerifiedAt?: Date | null;
  deletedAt?: Date | null;
}
