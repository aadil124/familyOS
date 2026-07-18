export class FamilyMemberResponseDto {
  id: string;
  familyId: string;
  fullName: string;
  relationship: string | null;
  dateOfBirth: Date | null;
  primaryEmail: string | null;
  primaryPhone: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
