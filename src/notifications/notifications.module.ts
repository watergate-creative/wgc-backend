import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Event } from '../events/entities/event.entity.js';
import { Participant } from '../participant/entities/participant.entity.js';
import { MailModule } from '../email/mail.module.js';
import { SMS_QUEUE } from './sms.constants.js';
import { SmsProcessor } from './sms.processor.js';

// ── Entities ──
import { NotificationLog } from './entities/notification-log.entity.js';

// ── Core ──
import { NotificationService } from './notification.service.js';
import { NotificationOrchestrator } from './notification.orchestrator.js';
import { NotificationTemplateRegistry, NOTIFICATION_TEMPLATE_PROVIDERS } from './templates/template-registry.js';
import { AudienceResolver } from './audience/audience-resolver.js';

// ── Template Providers ──
import {
  EventRegistrationConfirmationProvider,
  SessionBookingConfirmationProvider,
  SessionCancellationProvider,
  FormSubmissionAcknowledgementProvider,
  EventCountdownReminderProvider,
} from './templates/providers/transactional.providers.js';
import {
  UpcomingProgramAnnouncementProvider,
  NewWeekWishesProvider,
  NewMonthWishesProvider,
  NewsletterProvider,
} from './templates/providers/marketing.providers.js';

// ── Channels ──
import { EmailChannel } from './channels/email.channel.js';
import { SmsChannel } from './channels/sms.channel.js';
import { RcsChannel } from './channels/rcs.channel.js';
import { TermiiService } from './termii.service.js';

// ── Crons ──
import { CountdownCronService } from './crons/countdown.cron.js';
import { WishesCronService } from './crons/wishes.cron.js';

// ── Controllers ──
import { NotificationController } from './controllers/newsletter.controller.js';

/**
 * Unified Notification Module.
 *
 * This module is the single entry point for ALL notification concerns.
 * Domain modules import `NotificationsModule` and inject `NotificationService`.
 *
 * Architecture:
 * - `NotificationService` (façade) → `NotificationOrchestrator` → `IDeliveryChannel[]`
 * - `NotificationTemplateRegistry` maps type → template/subject/SMS
 * - `AudienceResolver` resolves recipients for broadcast notifications
 * - `NotificationLog` entity provides audit trail
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Event, Participant, NotificationLog]),
    MailModule, // EmailChannel depends on MailService
    BullModule.registerQueue({
      name: SMS_QUEUE,
    }),
  ],
  controllers: [NotificationController],
  providers: [
    // ── Core ──
    NotificationService,
    NotificationOrchestrator,
    NotificationTemplateRegistry,
    AudienceResolver,

    // ── Template Providers ──
    EventRegistrationConfirmationProvider,
    SessionBookingConfirmationProvider,
    SessionCancellationProvider,
    FormSubmissionAcknowledgementProvider,
    EventCountdownReminderProvider,
    UpcomingProgramAnnouncementProvider,
    NewWeekWishesProvider,
    NewMonthWishesProvider,
    NewsletterProvider,
    {
      provide: NOTIFICATION_TEMPLATE_PROVIDERS,
      useFactory: (...providers: any[]) => providers,
      inject: [
        EventRegistrationConfirmationProvider,
        SessionBookingConfirmationProvider,
        SessionCancellationProvider,
        FormSubmissionAcknowledgementProvider,
        EventCountdownReminderProvider,
        UpcomingProgramAnnouncementProvider,
        NewWeekWishesProvider,
        NewMonthWishesProvider,
        NewsletterProvider,
      ],
    },

    // ── Channels ──
    EmailChannel,
    SmsChannel,
    RcsChannel,
    TermiiService,
    SmsProcessor,

    // ── Multi-provider injection: all channels as an array ──
    {
      provide: 'DELIVERY_CHANNELS',
      useFactory: (
        email: EmailChannel,
        sms: SmsChannel,
        rcs: RcsChannel,
      ) => [email, sms, rcs],
      inject: [EmailChannel, SmsChannel, RcsChannel],
    },

    // ── Crons ──
    CountdownCronService,
    WishesCronService,
  ],
  exports: [NotificationService], // Only the façade is exported
})
export class NotificationsModule {}
