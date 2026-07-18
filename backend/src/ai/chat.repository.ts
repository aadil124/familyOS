import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AIConversation, AIMessage, Prisma } from '@prisma/client';

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createConversation(data: Prisma.AIConversationUncheckedCreateInput): Promise<AIConversation> {
    return this.prisma.aIConversation.create({
      data,
    });
  }

  async findConversationById(id: string): Promise<AIConversation | null> {
    return this.prisma.aIConversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  }

  async findConversationsByFamily(
    familyId: string,
    skip: number,
    take: number,
  ): Promise<AIConversation[]> {
    return this.prisma.aIConversation.findMany({
      where: {
        familyId,
        deletedAt: null,
      },
      skip,
      take,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateConversation(
    id: string,
    data: Prisma.AIConversationUncheckedUpdateInput,
  ): Promise<AIConversation> {
    return this.prisma.aIConversation.update({
      where: { id },
      data,
    });
  }

  async softDeleteConversation(id: string): Promise<AIConversation> {
    return this.prisma.aIConversation.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async createMessage(data: Prisma.AIMessageUncheckedCreateInput): Promise<AIMessage> {
    return this.prisma.aIMessage.create({
      data,
    });
  }

  async findMessagesByConversation(
    conversationId: string,
    skip: number,
    take: number,
  ): Promise<AIMessage[]> {
    return this.prisma.aIMessage.findMany({
      where: {
        conversationId,
      },
      skip,
      take,
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findRecentMessages(conversationId: string, limit: number): Promise<AIMessage[]> {
    const messages = await this.prisma.aIMessage.findMany({
      where: {
        conversationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
    return messages.reverse();
  }
}
