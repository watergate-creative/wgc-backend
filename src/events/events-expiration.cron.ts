import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventsService } from './events.service.js';

@Injectable()
export class EventLifecycleCronService {
  private readonly logger = new Logger(EventLifecycleCronService.name);

  constructor(private readonly eventsService: EventsService) {}

  
  @Cron(CronExpression.EVERY_MINUTE)
  async handleEventLifecycle(): Promise<void> {
    this.logger.debug('Running event lifecycle cron...');

    try {

      const completed = await this.eventsService.markExpiredEventsAsCompleted();

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
