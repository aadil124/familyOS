import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ChatSessionService } from './chat-session.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser as CurrentUserInterface } from '../auth/interfaces/auth.interface';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';

@ApiTags('AI Chat')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('v1/families/:familyId/chat/conversations')
export class ChatController {
  constructor(private readonly chatSessionService: ChatSessionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start a new AI assistant conversation thread' })
  @ApiCreatedResponse({ description: 'Conversation thread successfully created.' })
  @ApiBadRequestResponse({ description: 'Invalid input parameters.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  @ApiForbiddenResponse({ description: 'Access denied: You do not own this family workspace.' })
  async create(
    @Param('familyId') familyId: string,
    @Body() createConversationDto: CreateConversationDto,
    @CurrentUser() user: CurrentUserInterface,
  ) {
    const data = await this.chatSessionService.createConversation(
      user.userId,
      familyId,
      createConversationDto,
    );
    return {
      success: true,
      data,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List chat conversations in a family workspace' })
  @ApiOkResponse({ description: 'Conversations list retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  @ApiForbiddenResponse({ description: 'Access denied: You do not own this family workspace.' })
  async findAll(
    @Param('familyId') familyId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @CurrentUser() user: CurrentUserInterface,
  ) {
    const data = await this.chatSessionService.listConversations(
      user.userId,
      familyId,
      page,
      limit,
    );
    return {
      success: true,
      data,
    };
  }

  @Post(':conversationId/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a message to the AI assistant and receive a response' })
  @ApiCreatedResponse({ description: 'Assistant response generated and stored.' })
  @ApiBadRequestResponse({ description: 'Message content cannot be empty.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  @ApiForbiddenResponse({ description: 'Access denied: You do not own this family workspace.' })
  @ApiNotFoundResponse({ description: 'Conversation not found.' })
  async sendMessage(
    @Param('familyId') familyId: string,
    @Param('conversationId') conversationId: string,
    @Body() sendMessageDto: SendMessageDto,
    @CurrentUser() user: CurrentUserInterface,
  ) {
    const data = await this.chatSessionService.sendMessage(
      user.userId,
      familyId,
      conversationId,
      sendMessageDto,
    );
    return {
      success: true,
      data,
    };
  }

  @Get(':conversationId/messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get chat history/messages for a conversation' })
  @ApiOkResponse({ description: 'Chat history retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  @ApiForbiddenResponse({ description: 'Access denied: You do not own this family workspace.' })
  @ApiNotFoundResponse({ description: 'Conversation not found.' })
  async getMessages(
    @Param('familyId') familyId: string,
    @Param('conversationId') conversationId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @CurrentUser() user: CurrentUserInterface,
  ) {
    const data = await this.chatSessionService.listMessages(
      user.userId,
      familyId,
      conversationId,
      page,
      limit,
    );
    return {
      success: true,
      data,
    };
  }
}
