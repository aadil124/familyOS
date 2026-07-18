import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: 'uuid-string' })
  id!: string;

  @ApiProperty({ example: 'John Doe' })
  fullName!: string;

  @ApiProperty({ example: 'john@example.com' })
  email!: string;

  @ApiProperty({ example: 'active' })
  status!: string;

  @ApiProperty({ example: '2026-07-18T13:38:03Z', nullable: true })
  emailVerifiedAt?: Date | null;

  @ApiProperty({ example: '2026-07-18T13:38:03Z', nullable: true })
  lastLoginAt?: Date | null;

  @ApiProperty({ example: '2026-07-18T13:38:03Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-07-18T13:38:03Z' })
  updatedAt!: Date;

  @ApiProperty({ example: '2026-07-18T13:38:03Z', nullable: true })
  deletedAt?: Date | null;
}
