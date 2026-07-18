export interface FamilyAttributes {
  id: string;
  ownerUserId: string;
  name: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface FamilyCreateInput {
  ownerUserId: string;
  name: string;
  status: string;
}

export interface FamilyUpdateInput {
  name?: string;
  status?: string;
  deletedAt?: Date | null;
}
