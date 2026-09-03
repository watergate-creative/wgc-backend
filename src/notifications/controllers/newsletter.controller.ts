import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../auth/entities/user.entity.js';
import { NotificationService } from '../notification.service.js';
import {
  NotificationType,
  DeliveryChannel,
} from '../types/notification-types.js';
import { SendNewsletterDto } from '../dto/send-newsletter.dto.js';
import { ProgramAnnouncementDto } from '../dto/program-announcement.dto.js';

@Controller('admin/notifications')
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(private readonly notificationService: NotificationService) {}

  @Post('newsletter')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async sendNewsletter(@Body() dto: SendNewsletterDto) {
    this.logger.log(`Admin triggered newsletter: "${dto.subject}"`);

    const result = await this.notificationService.broadcast({
      type: NotificationType.NEWSLETTER,
      channels: [DeliveryChannel.EMAIL],
      context: {
        subject: dto.subject,
        htmlContent: dto.htmlContent,
        preheader: dto.preheader,
        year: new Date().getFullYear(),
      },
      audienceFilter: {
        eventId: dto.eventId,
        hasContactConsent: dto.hasContactConsent ?? true,
        hasAttended: dto.hasAttended,
      },
    });

    return {
      message: `Newsletter queued for ${result.totalRecipients} recipients`,
      totalRecipients: result.totalRecipients,
    };
  }

  @Post('program-announcement')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async announceProgram(@Body() dto: ProgramAnnouncementDto) {
    this.logger.log(`Admin triggered program announcement: "${dto.programName}"`);

    const result = await this.notificationService.broadcast({
      type: NotificationType.UPCOMING_PROGRAM_ANNOUNCEMENT,
      channels: [DeliveryChannel.EMAIL, DeliveryChannel.SMS],
      context: {
        programName: dto.programName,
        description: dto.description,
        startDate: dto.startDate,
        location: dto.location,
        bannerImageUrl: dto.bannerImageUrl,
        actionUrl: dto.actionUrl,
        year: new Date().getFullYear(),
      },
      audienceFilter: {
        eventId: dto.eventId,
        hasContactConsent: dto.hasContactConsent ?? true,
        hasAttended: dto.hasAttended,
      },
    });

    return {
      message: `Program announcement queued for ${result.totalRecipients} recipients`,
      totalRecipients: result.totalRecipients,
    };
  }
}
