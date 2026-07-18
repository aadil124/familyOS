import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatRepository } from './chat.repository';
import { FamilyRepository } from '../family/family.repository';
import { ContextBuilderService } from './context-builder.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ConversationResponseDto } from './dto/conversation-response.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { AIConversation, AIMessage } from '@prisma/client';

@Injectable()
export class ChatSessionService {
  private readonly logger = new Logger(ChatSessionService.name);

  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly familyRepository: FamilyRepository,
    private readonly contextBuilderService: ContextBuilderService,
    private readonly configService: ConfigService,
  ) {}

  private async verifyFamilyAccess(userId: string, familyId: string): Promise<void> {
    const family = await this.familyRepository.findById(familyId);
    if (!family || family.deletedAt !== null) {
      throw new NotFoundException(`Family workspace with ID "${familyId}" not found`);
    }
    if (family.ownerUserId !== userId) {
      throw new ForbiddenException('Access denied: You do not own this family workspace');
    }
  }

  private async verifyConversationAccess(familyId: string, conversationId: string): Promise<AIConversation> {
    const conversation = await this.chatRepository.findConversationById(conversationId);
    if (!conversation || conversation.deletedAt !== null || conversation.familyId !== familyId) {
      throw new NotFoundException(`Conversation with ID "${conversationId}" not found in this family`);
    }
    return conversation;
  }

  async createConversation(
    userId: string,
    familyId: string,
    dto: CreateConversationDto,
  ): Promise<ConversationResponseDto> {
    await this.verifyFamilyAccess(userId, familyId);

    const title = dto.title || 'New Conversation';
    const conversation = await this.chatRepository.createConversation({
      familyId,
      userId,
      title,
      status: 'active',
    });

    return this.mapConversationToDto(conversation);
  }

  async listConversations(
    userId: string,
    familyId: string,
    page = 1,
    limit = 10,
  ): Promise<ConversationResponseDto[]> {
    await this.verifyFamilyAccess(userId, familyId);

    const skip = (page - 1) * limit;
    const conversations = await this.chatRepository.findConversationsByFamily(familyId, skip, limit);

    return conversations.map((conv) => this.mapConversationToDto(conv));
  }

  async listMessages(
    userId: string,
    familyId: string,
    conversationId: string,
    page = 1,
    limit = 20,
  ): Promise<MessageResponseDto[]> {
    await this.verifyFamilyAccess(userId, familyId);
    await this.verifyConversationAccess(familyId, conversationId);

    const skip = (page - 1) * limit;
    const messages = await this.chatRepository.findMessagesByConversation(conversationId, skip, limit);

    return messages.map((msg) => this.mapMessageToDto(msg));
  }

  async sendMessage(
    userId: string,
    familyId: string,
    conversationId: string,
    dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    // 1. Validate permissions
    await this.verifyFamilyAccess(userId, familyId);
    await this.verifyConversationAccess(familyId, conversationId);

    const content = dto.content.trim();
    if (!content) {
      throw new BadRequestException('Message content cannot be empty');
    }

    // 2. Save User Message
    await this.chatRepository.createMessage({
      conversationId,
      role: 'user',
      content,
    });

    // 3. Build context from family vault
    const context = await this.contextBuilderService.buildContext(familyId);

    // 4. Fetch message history for the context window (limit to 5)
    const history = await this.chatRepository.findRecentMessages(conversationId, 5);

    // 5. Build system prompt
    const systemPrompt = `You are the FamilyOS AI Chat Assistant, a helpful and secure digital secretary for a family workspace.

Your responses must strictly adhere to the following rules:
1. Ground all answers ONLY in the family vault documents, readiness assessments, and family member details provided in the context block below.
2. If the user asks about something not present in the context, or if the context is empty/insufficient, you must refuse to answer. Do not speculate or hallucinate.
3. For any out-of-scope questions, questions asking for general knowledge, or questions requesting official legal, financial, or government registration advice, you must output exactly: "I can only answer questions related to your family's uploaded documents and readiness checklists."
4. Do not expose document data or details outside the provided context.
5. Do not pretend to be an official government authority. All guidance is informational.

Context:
${context}`;

    let reply = '';
    let safetyStatus = 'safe';
    let failureReason: string | null = null;

    const providerType = this.configService.get<string>('AI_PROVIDER', 'mock').toLowerCase();

    if (providerType === 'openai') {
      try {
        const apiKey = this.configService.get<string>('OPENAI_API_KEY');
        if (!apiKey) {
          throw new Error('OPENAI_API_KEY is not configured');
        }

        const model = this.configService.get<string>('OPENAI_MODEL', 'gpt-4o-mini');

        // Execute API call via native fetch
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              ...history.map((msg) => ({ role: msg.role, content: msg.content })),
              { role: 'user', content },
            ],
            temperature: 0.2,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`OpenAI API returned status ${response.status}: ${errText}`);
        }

        const data = await response.json() as any;
        reply = data.choices[0].message.content.trim();

      } catch (error) {
        this.logger.error(`OpenAI Chat completion failed: ${error.message}`, error.stack);
        reply = 'I am sorry, but I encountered an error communicating with my AI service. Please try again later.';
        safetyStatus = 'failed';
        failureReason = error.message;
      }
    } else {
      // Mock execution (for tests and offline development)
      const lowercaseQuery = content.toLowerCase();

      // Check for out-of-scope general queries
      const outOfScopeKeywords = ['recipe', 'weather', 'news', 'joke', 'capital of', 'how to code', 'write a function', 'stock market'];
      const legalAdviceKeywords = ['legal advice', 'lawsuit', 'sue', 'court', 'financial advice', 'invest in', 'buy stock'];
      
      const isOutOfScope = outOfScopeKeywords.some((kw) => lowercaseQuery.includes(kw)) ||
                           legalAdviceKeywords.some((kw) => lowercaseQuery.includes(kw));

      if (isOutOfScope) {
        reply = "I can only answer questions related to your family's uploaded documents and readiness checklists.";
      } else if (lowercaseQuery.includes('expire') || lowercaseQuery.includes('expiry') || lowercaseQuery.includes('validity')) {
        // Expiry search in context
        if (context.includes('Expires At:')) {
          reply = 'According to your vault, there are document expirations listed: ';
          const lines = context.split('\n');
          const expiryLines = lines.filter((line) => line.includes('Document:') || line.includes('Expires At:'));
          reply += '\n' + expiryLines.join('\n');
        } else {
          reply = 'I could not find any active documents in your vault with an expiry date configured.';
        }
      } else if (lowercaseQuery.includes('ready') || lowercaseQuery.includes('readiness') || lowercaseQuery.includes('missing')) {
        // Readiness search in context
        if (context.includes('Life Event:')) {
          reply = 'Based on your latest assessments: ';
          const lines = context.split('\n');
          const assessmentLines = lines.filter((line) => line.includes('Life Event:') || line.includes('Readiness Score:') || line.includes('Missing Documents:'));
          reply += '\n' + assessmentLines.join('\n');
        } else {
          reply = 'No readiness assessments have been generated yet for your family members. Go to the Assessments tab to run one.';
        }
      } else if (lowercaseQuery.includes('fictitious') || lowercaseQuery.includes('fake') || lowercaseQuery.includes('does leo have a passport')) {
        // Hallucination mitigation check
        reply = 'I could not find that document in your family vault. Please upload it if you would like me to analyze it.';
      } else {
        reply = 'I am grounded in your family workspace vault. You have uploaded documents. Let me know how I can help you find details or check your life event readiness.';
      }
    }

    // 6. Save Assistant Response
    const assistantMessage = await this.chatRepository.createMessage({
      conversationId,
      role: 'assistant',
      content: reply,
      contextSummary: context.slice(0, 1000),
      safetyStatus,
      failureReason,
    });

    // 7. Update lastMessageAt on Conversation
    await this.chatRepository.updateConversation(conversationId, {
      lastMessageAt: new Date(),
    });

    return this.mapMessageToDto(assistantMessage);
  }

  private mapConversationToDto(conv: AIConversation): ConversationResponseDto {
    return {
      id: conv.id,
      familyId: conv.familyId,
      userId: conv.userId,
      title: conv.title,
      status: conv.status,
      lastMessageAt: conv.lastMessageAt,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    };
  }

  private mapMessageToDto(msg: AIMessage): MessageResponseDto {
    return {
      id: msg.id,
      conversationId: msg.conversationId,
      role: msg.role,
      content: msg.content,
      safetyStatus: msg.safetyStatus,
      createdAt: msg.createdAt,
    };
  }
}
