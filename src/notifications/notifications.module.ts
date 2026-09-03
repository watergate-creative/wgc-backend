import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Event } from '../events/entities/event.entity.js';
import { Participant } from '../participant/entities/participant.entity.js';
import { MailModule } from '../email/mail.module.js';
import { SMS_QUEUE } from './sms.constants.js';
import { SmsProcessor } from './sms.processor.js';

import { NotificationLog } from './entities/notification-log.entity.js';

import { NotificationService } from './notification.service.js';
import { NotificationOrchestrator } from './notification.orchestrator.js';
import { NotificationTemplateRegistry, NOTIFICATION_TEMPLATE_PROVIDERS } from './templates/template-registry.js';
import { AudienceResolver } from './audience/audience-resolver.js';

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

import { EmailChannel } from './channels/email.channel.js';
import { SmsChannel } from './channels/sms.channel.js';
import { RcsChannel } from './channels/rcs.channel.js';
import { TermiiService } from './termii.service.js';

import { CountdownCronService } from './crons/countdown.cron.js';
import { WishesCronService } from './crons/wishes.cron.js';

import { NotificationController } from './controllers/newsletter.controller.js';

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

    NotificationService,
    NotificationOrchestrator,
    NotificationTemplateRegistry,
    AudienceResolver,

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

    EmailChannel,
    SmsChannel,
    RcsChannel,
    TermiiService,
    SmsProcessor,

    {
      provide: 'DELIVERY_CHANNELS',
      useFactory: (
        email: EmailChannel,
        sms: SmsChannel,
        rcs: RcsChannel,
      ) => [email, sms, rcs],
      inject: [EmailChannel, SmsChannel, RcsChannel],
    },

    CountdownCronService,
    WishesCronService,
  ],
  exports: [NotificationService], // Only the façade is exported
})
export class NotificationsModule {}
