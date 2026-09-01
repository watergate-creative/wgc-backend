import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventsService } from './events.service.js';

@Injectable()
export class EventLifecycleCronService {
  private readonly logger = new Logger(EventLifecycleCronService.name);

  constructor(private readonly eventsService: EventsService) {}

  /**
   * Runs every minute to manage event lifecycle transitions:
   *
   * 1. PUBLISHED → ONGOING  when startDate ≤ NOW ≤ endDate
   * 2. PUBLISHED/ONGOING → COMPLETED  when endDate < NOW
   *
   * Order matters: we mark completed first so that events whose
   * endDate just passed are not briefly set to ongoing.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleEventLifecycle(): Promise<void> {
    this.logger.debug('Running event lifecycle cron...');

    try {
      // Step 1: Complete expired events first (endDate < NOW)
      const completed = await this.eventsService.markExpiredEventsAsCompleted();

      // Step 2: Transition to ongoing (startDate <= NOW <= endDate)
      const ongoing = await this.eventsService.markOngoingEvents();

      if (completed > 0 || ongoing > 0) {
        this.logger.log(
          `Lifecycle cron: ${ongoing} event(s) → ongoing, ${completed} event(s) → completed`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error executing event lifecycle cron: ${(error as Error).message}`,
      );
    }
  }
}
