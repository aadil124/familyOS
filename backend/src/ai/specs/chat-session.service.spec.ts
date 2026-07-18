import { Test, TestingModule } from '@nestjs/testing';
import { ChatSessionService } from '../chat-session.service';
import { ChatRepository } from '../chat.repository';
import { FamilyRepository } from '../../family/family.repository';
import { ContextBuilderService } from '../context-builder.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { AIConversation, AIMessage } from '@prisma/client';

describe('ChatSessionService', () => {
  let service: ChatSessionService;
  let chatRepository: any;
  let familyRepository: any;
  let contextBuilderService: any;
  let configService: any;

  const mockChatRepository = {
    createConversation: jest.fn(),
    findConversationById: jest.fn(),
    findConversationsByFamily: jest.fn(),
    updateConversation: jest.fn(),
    softDeleteConversation: jest.fn(),
    createMessage: jest.fn(),
    findMessagesByConversation: jest.fn(),
    findRecentMessages: jest.fn(),
  };

  const mockFamilyRepository = {
    findById: jest.fn(),
  };

  const mockContextBuilderService = {
    buildContext: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
      if (key === 'AI_PROVIDER') return 'mock';
      return defaultValue;
    }),
  };

  const mockFamily = {
    id: 'family-1',
    ownerUserId: 'user-1',
    name: 'Doe Vault',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockConversation: AIConversation = {
    id: 'conv-1',
    familyId: 'family-1',
    userId: 'user-1',
    title: 'Applying for passport',
    status: 'active',
    lastMessageAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockUserMessage: AIMessage = {
    id: 'msg-1',
    conversationId: 'conv-1',
    role: 'user',
    content: 'Do I have a passport?',
    contextSummary: null,
    safetyStatus: null,
    confidenceScore: null,
    failureReason: null,
    createdAt: new Date(),
  };

  const mockAssistantMessage: AIMessage = {
    id: 'msg-2',
    conversationId: 'conv-1',
    role: 'assistant',
    content: 'Based on the context, yes you do.',
    contextSummary: 'vault summaries',
    safetyStatus: 'safe',
    confidenceScore: null,
    failureReason: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatSessionService,
        { provide: ChatRepository, useValue: mockChatRepository },
        { provide: FamilyRepository, useValue: mockFamilyRepository },
        { provide: ContextBuilderService, useValue: mockContextBuilderService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ChatSessionService>(ChatSessionService);
    chatRepository = module.get<ChatRepository>(ChatRepository);
    familyRepository = module.get<FamilyRepository>(FamilyRepository);
    contextBuilderService = module.get<ContextBuilderService>(ContextBuilderService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  describe('createConversation', () => {
    it('should throw NotFoundException if family is not found', async () => {
      mockFamilyRepository.findById.mockResolvedValue(null);

      await expect(
        service.createConversation('user-1', 'family-1', { title: 'Applying for passport' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own the family workspace', async () => {
      mockFamilyRepository.findById.mockResolvedValue({
        ...mockFamily,
        ownerUserId: 'user-different',
      });

      await expect(
        service.createConversation('user-1', 'family-1', { title: 'Applying for passport' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should successfully create conversation thread', async () => {
      mockFamilyRepository.findById.mockResolvedValue(mockFamily);
      mockChatRepository.createConversation.mockResolvedValue(mockConversation);

      const result = await service.createConversation('user-1', 'family-1', { title: 'Applying for passport' });

      expect(chatRepository.createConversation).toHaveBeenCalledWith({
        familyId: 'family-1',
        userId: 'user-1',
        title: 'Applying for passport',
        status: 'active',
      });
      expect(result.id).toEqual(mockConversation.id);
    });
  });

  describe('sendMessage', () => {
    it('should throw BadRequestException if message is empty', async () => {
      mockFamilyRepository.findById.mockResolvedValue(mockFamily);
      mockChatRepository.findConversationById.mockResolvedValue(mockConversation);

      await expect(
        service.sendMessage('user-1', 'family-1', 'conv-1', { content: '  ' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should correctly process out-of-scope queries with fallback string', async () => {
      mockFamilyRepository.findById.mockResolvedValue(mockFamily);
      mockChatRepository.findConversationById.mockResolvedValue(mockConversation);
      mockContextBuilderService.buildContext.mockResolvedValue('No documents');
      mockChatRepository.findRecentMessages.mockResolvedValue([]);
      
      mockChatRepository.createMessage
        .mockResolvedValueOnce(mockUserMessage) // User message
        .mockResolvedValueOnce({
          ...mockAssistantMessage,
          content: "I can only answer questions related to your family's uploaded documents and readiness checklists.",
        }); // Assistant message

      const result = await service.sendMessage('user-1', 'family-1', 'conv-1', { content: 'What is the recipe for chocolate cake?' });

      expect(result.content).toEqual("I can only answer questions related to your family's uploaded documents and readiness checklists.");
    });
  });
});
