import {
  Controller,
  Get,
  Patch,
  Put,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ListNotificationsQueryDto } from './dto/list-notifications.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser as CurrentUserInterface } from '../auth/interfaces/auth.interface';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('v1/families/:familyId/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve in-app alerts and notifications' })
  @ApiOkResponse({
    description: 'Notifications retrieved successfully.',
    type: [NotificationResponseDto],
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  @ApiForbiddenResponse({ description: 'Access denied: You do not own this family workspace.' })
  async findAll(
    @Param('familyId') familyId: string,
    @Query() query: ListNotificationsQueryDto,
    @CurrentUser() user: CurrentUserInterface,
  ) {
    const { data, total } = await this.notificationsService.listNotifications(
      user.userId,
      familyId,
      query,
    );

    return {
      success: true,
      data,
      meta: {
        total,
        page: query.page || 1,
        limit: query.limit || 20,
      },
    };
  }

  @Patch(':notificationId/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark an alert as read (PATCH version)' })
  @ApiOkResponse({
    description: 'Notification marked as read successfully.',
    type: NotificationResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  @ApiForbiddenResponse({ description: 'Access denied: You do not own this family workspace.' })
  @ApiNotFoundResponse({ description: 'Notification not found in this family.' })
  async markReadPatch(
    @Param('familyId') familyId: string,
    @Param('notificationId') notificationId: string,
    @CurrentUser() user: CurrentUserInterface,
  ) {
    const data = await this.notificationsService.markAsRead(
      user.userId,
      familyId,
      notificationId,
    );
    return {
      success: true,
      data,
    };
  }

  @Put(':notificationId/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark an alert as read (PUT version for API spec compatibility)' })
  @ApiOkResponse({
    description: 'Notification marked as read successfully.',
    type: NotificationResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  @ApiForbiddenResponse({ description: 'Access denied: You do not own this family workspace.' })
  @ApiNotFoundResponse({ description: 'Notification not found in this family.' })
  async markReadPut(
    @Param('familyId') familyId: string,
    @Param('notificationId') notificationId: string,
    @CurrentUser() user: CurrentUserInterface,
  ) {
    const data = await this.notificationsService.markAsRead(
      user.userId,
      familyId,
      notificationId,
    );
    return {
      success: true,
      data,
    };
  }
}
