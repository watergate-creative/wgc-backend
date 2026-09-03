import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationService } from '../notification.service.js';
import {
  NotificationType,
  DeliveryChannel,
} from '../types/notification-types.js';

@Injectable()
export class WishesCronService {
  private readonly logger = new Logger(WishesCronService.name);

  constructor(private readonly notificationService: NotificationService) {}

  
  @Cron('0 7 * * 1')
  async sendNewWeekWishes(): Promise<void> {
    this.logger.log('Running new week wishes cron...');

    try {
      const result = await this.notificationService.broadcast({
        type: NotificationType.NEW_WEEK_WISHES,
        channels: [DeliveryChannel.EMAIL],
        context: {
          recipientName: '', // will be overridden per-recipient by broadcast()
          weekMessage:
            'May this new week bring you fresh grace, divine strength, and supernatural breakthroughs. God is with you!',
          bibleVerse:
            'The steadfast love of the Lord never ceases; his mercies never come to an end; they are new every morning.',
          bibleReference: 'Lamentations 3:22-23',
          year: new Date().getFullYear(),
        },
        audienceFilter: { hasContactConsent: true },
      });

      this.logger.log(
        `New week wishes sent to ${result.totalRecipients} recipients`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`New week wishes cron failed: ${msg}`);
    }
  }

  
  @Cron('0 7 1 * *')
  async sendNewMonthWishes(): Promise<void> {
    this.logger.log('Running new month wishes cron...');

    const now = new Date();
    const monthName = now.toLocaleString('en-GB', { month: 'long' });

    try {
      const result = await this.notificationService.broadcast({
        type: NotificationType.NEW_MONTH_WISHES,
        channels: [DeliveryChannel.EMAIL],
        context: {
          recipientName: '', // will be overridden per-recipient by broadcast()
          monthName,
          monthMessage: `Welcome to the month of ${monthName}! May this month overflow with blessings, favour, and the manifest presence of God in your life.`,
          bibleVerse:
            'For I know the plans I have for you, declares the Lord, plans for welfare and not for evil, to give you a future and a hope.',
          bibleReference: 'Jeremiah 29:11',
          year: now.getFullYear(),
        },
        audienceFilter: { hasContactConsent: true },
      });

      this.logger.log(
        `New month wishes (${monthName}) sent to ${result.totalRecipients} recipients`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`New month wishes cron failed: ${msg}`);
    }
  }
}
