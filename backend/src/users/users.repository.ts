import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UserAttributes, UserCreateInput, UserUpdateInput } from './interfaces/user.interface';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: UserCreateInput): Promise<UserAttributes> {
    return this.prisma.user.create({
      data,
    });
  }

  async findById(id: string): Promise<UserAttributes | null> {
    return this.prisma.user.findUnique({
      where: { id, deletedAt: null },
    });
  }

  async findByEmail(email: string): Promise<UserAttributes | null> {
    return this.prisma.user.findUnique({
      where: { email, deletedAt: null },
    });
  }

  async update(id: string, data: UserUpdateInput): Promise<UserAttributes> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string): Promise<UserAttributes> {
    return this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'deleted',
      },
    });
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email, deletedAt: null },
    });
    return count > 0;
  }
}
