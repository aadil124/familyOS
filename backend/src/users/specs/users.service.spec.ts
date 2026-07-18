import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { UsersRepository } from '../users.repository';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as passwordUtil from '../../auth/utils/password.util';
import { UserAttributes } from '../interfaces/user.interface';

describe('UsersService', () => {
  let service: UsersService;

  const mockUsersRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    existsByEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: mockUsersRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  const mockUser: UserAttributes = {
    id: 'user-uuid-1',
    email: 'john@example.com',
    fullName: 'John Doe',
    passwordHash: 'hashed_password',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  describe('createUser', () => {
    it('should throw ConflictException if email exists', async () => {
      mockUsersRepository.existsByEmail.mockResolvedValue(true);
      const dto = {
        email: 'john@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      await expect(service.createUser(dto)).rejects.toThrow(ConflictException);
    });

    it('should create a user, hash password and combine name', async () => {
      mockUsersRepository.existsByEmail.mockResolvedValue(false);
      mockUsersRepository.create.mockResolvedValue(mockUser);
      jest.spyOn(passwordUtil, 'hashPassword').mockResolvedValue('hashed_password');

      const dto = {
        email: 'john@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = await service.createUser(dto);

      expect(passwordUtil.hashPassword).toHaveBeenCalledWith(dto.password);
      expect(mockUsersRepository.create).toHaveBeenCalledWith({
        email: 'john@example.com',
        passwordHash: 'hashed_password',
        fullName: 'John Doe',
        status: 'active',
      });
      expect(result.fullName).toBe('John Doe');
      expect(result.id).toBe('user-uuid-1');
    });
  });

  describe('findById', () => {
    it('should return a user if found', async () => {
      mockUsersRepository.findById.mockResolvedValue(mockUser);
      const result = await service.findById('user-uuid-1');
      expect(result.id).toBe(mockUser.id);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersRepository.findById.mockResolvedValue(null);
      await expect(service.findById('user-uuid-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return a user if found', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(mockUser);
      const result = await service.findByEmail('john@example.com');
      expect(result.email).toBe(mockUser.email);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(null);
      await expect(service.findByEmail('john@example.com')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUser', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      mockUsersRepository.findById.mockResolvedValue(null);
      await expect(
        service.updateUser('invalid-id', { email: 'new@example.com' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if new email is already in use', async () => {
      mockUsersRepository.findById.mockResolvedValue(mockUser);
      mockUsersRepository.existsByEmail.mockResolvedValue(true);

      await expect(
        service.updateUser('user-uuid-1', { email: 'existing@example.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should update user attributes including names mapped to fullName', async () => {
      mockUsersRepository.findById.mockResolvedValue(mockUser);
      mockUsersRepository.update.mockResolvedValue({
        ...mockUser,
        fullName: 'Johnny Smith',
      });

      const result = await service.updateUser('user-uuid-1', {
        firstName: 'Johnny',
        lastName: 'Smith',
      });

      expect(mockUsersRepository.update).toHaveBeenCalledWith('user-uuid-1', {
        fullName: 'Johnny Smith',
      });
      expect(result.fullName).toBe('Johnny Smith');
    });
  });

  describe('softDeleteUser', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      mockUsersRepository.findById.mockResolvedValue(null);
      await expect(service.softDeleteUser('user-uuid-1')).rejects.toThrow(NotFoundException);
    });

    it('should call repository softDelete and return user details', async () => {
      mockUsersRepository.findById.mockResolvedValue(mockUser);
      const deletedMockUser = {
        ...mockUser,
        status: 'deleted',
        deletedAt: new Date(),
      };
      mockUsersRepository.softDelete.mockResolvedValue(deletedMockUser);

      const result = await service.softDeleteUser('user-uuid-1');
      expect(mockUsersRepository.softDelete).toHaveBeenCalledWith('user-uuid-1');
      expect(result.status).toBe('deleted');
      expect(result.deletedAt).toBeDefined();
    });
  });

  describe('existsByEmail', () => {
    it('should return true if email exists', async () => {
      mockUsersRepository.existsByEmail.mockResolvedValue(true);
      const result = await service.existsByEmail('john@example.com');
      expect(result).toBe(true);
    });

    it('should return false if email does not exist', async () => {
      mockUsersRepository.existsByEmail.mockResolvedValue(false);
      const result = await service.existsByEmail('john@example.com');
      expect(result).toBe(false);
    });
  });
});
