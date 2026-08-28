import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventsService } from './events.service.js';

@Injectable()
export class EventExpirationCronService {
  private readonly logger = new Logger(EventExpirationCronService.name);

  constructor(private readonly eventsService: EventsService) {}

  /**
   * Runs daily at midnight.
   * Marks all published events whose endDate has elapsed as completed,
   * ensuring they are never shown to users for registration.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredEvents(): Promise<void> {
    this.logger.log('Running event expiration cron job...');

    try {
      const affected = await this.eventsService.markExpiredEventsAsCompleted();
      this.logger.log(
        affected > 0
          ? `Event expiration cron completed: ${affected} event(s) marked as completed.`
          : 'Event expiration cron completed: no expired events found.',
      );
    } catch (error) {
      this.logger.error(
        `Error executing event expiration cron: ${(error as Error).message}`,
      );
    }
  }
}
