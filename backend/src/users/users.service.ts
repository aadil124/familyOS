import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserAttributes, UserUpdateInput } from './interfaces/user.interface';
import { hashPassword } from '../auth/utils/password.util';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async createUser(dto: CreateUserDto): Promise<UserResponseDto> {
    const emailExists = await this.usersRepository.existsByEmail(dto.email);
    if (emailExists) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await hashPassword(dto.password);
    const fullName = `${dto.firstName} ${dto.lastName}`.trim();

    const user = await this.usersRepository.create({
      email: dto.email,
      passwordHash,
      fullName,
      status: 'active',
    });

    return this.mapToResponseDto(user);
  }

  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.mapToResponseDto(user);
  }

  async findByEmail(email: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.mapToResponseDto(user);
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const existingUser = await this.usersRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const updateData: UserUpdateInput = {};

    if (dto.email) {
      if (dto.email !== existingUser.email) {
        const emailExists = await this.usersRepository.existsByEmail(dto.email);
        if (emailExists) {
          throw new ConflictException('Email is already registered');
        }
      }
      updateData.email = dto.email;
    }

    if (dto.firstName !== undefined || dto.lastName !== undefined) {
      const parts = existingUser.fullName.split(' ');
      const currentFirst = parts[0] || '';
      const currentLast = parts.slice(1).join(' ') || '';
      const first = dto.firstName !== undefined ? dto.firstName : currentFirst;
      const last = dto.lastName !== undefined ? dto.lastName : currentLast;
      updateData.fullName = `${first} ${last}`.trim();
    }

    if (dto.status !== undefined) {
      updateData.status = dto.status;
    }

    const updatedUser = await this.usersRepository.update(id, updateData);
    return this.mapToResponseDto(updatedUser);
  }

  async softDeleteUser(id: string): Promise<UserResponseDto> {
    const existingUser = await this.usersRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const deletedUser = await this.usersRepository.softDelete(id);
    return this.mapToResponseDto(deletedUser);
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.usersRepository.existsByEmail(email);
  }

  private mapToResponseDto(user: UserAttributes): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.fullName = user.fullName;
    dto.email = user.email;
    dto.status = user.status;
    dto.emailVerifiedAt = user.emailVerifiedAt;
    dto.lastLoginAt = user.lastLoginAt;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    dto.deletedAt = user.deletedAt;
    return dto;
  }
}
