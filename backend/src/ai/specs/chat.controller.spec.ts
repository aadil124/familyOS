import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from '../chat.controller';
import { ChatSessionService } from '../chat-session.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/interfaces/auth.interface';

describe('ChatController', () => {
  let controller: ChatController;
  let chatSessionService: ChatSessionService;

  const mockChatSessionService = {
    createConversation: jest.fn(),
    listConversations: jest.fn(),
    listMessages: jest.fn(),
    sendMessage: jest.fn(),
  };

  const mockUser: CurrentUser = {
    userId: 'user-1',
    email: 'test@example.com',
    role: 'OWNER',
  };

  const mockConversationDto = {
    id: 'conv-1',
    familyId: 'family-1',
    userId: 'user-1',
    title: 'Applying for passport',
    status: 'active',
    lastMessageAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMessageDto = {
    id: 'msg-1',
    conversationId: 'conv-1',
    role: 'assistant',
    content: 'Based on your vault, you are missing an address proof...',
    safetyStatus: 'safe',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: ChatSessionService,
          useValue: mockChatSessionService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<ChatController>(ChatController);
    chatSessionService = module.get<ChatSessionService>(ChatSessionService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should successfully start a new conversation thread', async () => {
      mockChatSessionService.createConversation.mockResolvedValue(mockConversationDto);

      const result = await controller.create('family-1', { title: 'Applying for passport' }, mockUser);

      expect(chatSessionService.createConversation).toHaveBeenCalledWith('user-1', 'family-1', { title: 'Applying for passport' });
      expect(result).toEqual({
        success: true,
        data: mockConversationDto,
      });
    });
  });

  describe('findAll', () => {
    it('should list chat conversations in a family workspace', async () => {
      mockChatSessionService.listConversations.mockResolvedValue([mockConversationDto]);

      const result = await controller.findAll('family-1', 1, 10, mockUser);

      expect(chatSessionService.listConversations).toHaveBeenCalledWith('user-1', 'family-1', 1, 10);
      expect(result).toEqual({
        success: true,
        data: [mockConversationDto],
      });
    });
  });

  describe('sendMessage', () => {
    it('should send a user message and return assistant response', async () => {
      mockChatSessionService.sendMessage.mockResolvedValue(mockMessageDto);

      const result = await controller.sendMessage('family-1', 'conv-1', { content: 'Do I have a passport?' }, mockUser);

      expect(chatSessionService.sendMessage).toHaveBeenCalledWith('user-1', 'family-1', 'conv-1', { content: 'Do I have a passport?' });
      expect(result).toEqual({
        success: true,
        data: mockMessageDto,
      });
    });
  });

  describe('getMessages', () => {
    it('should get chat history/messages for a conversation', async () => {
      mockChatSessionService.listMessages.mockResolvedValue([mockMessageDto]);

      const result = await controller.getMessages('family-1', 'conv-1', 1, 20, mockUser);

      expect(chatSessionService.listMessages).toHaveBeenCalledWith('user-1', 'family-1', 'conv-1', 1, 20);
      expect(result).toEqual({
        success: true,
        data: [mockMessageDto],
      });
    });
  });
});
