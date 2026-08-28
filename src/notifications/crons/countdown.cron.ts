import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Event, EventStatus } from '../../events/entities/event.entity.js';
import { Participant } from '../../participant/entities/participant.entity.js';
import { NotificationService } from '../notification.service.js';
import {
  NotificationType,
  DeliveryChannel,
} from '../types/notification-types.js';

/**
 * Daily cron that sends countdown reminders to registered participants
 * for events starting within the next 7 days.
 *
 * Refactored to use the unified NotificationService façade instead
 * of directly coupling to MailService + TermiiService.
 */
@Injectable()
export class CountdownCronService {
  private readonly logger = new Logger(CountdownCronService.name);

  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Participant)
    private readonly participantRepository: Repository<Participant>,
    private readonly notificationService: NotificationService,
  ) {}

  @Cron('0 12 * * *') // Runs every day at 12:00 PM (Noon)
  async handleDailyCountdowns() {
    this.logger.log('Running daily event countdown cron job...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);
    in7Days.setHours(23, 59, 59, 999);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    try {
      const upcomingEvents = await this.eventRepository.find({
        where: {
          status: EventStatus.PUBLISHED,
          startDate: Between(tomorrow, in7Days),
        },
      });

      if (upcomingEvents.length === 0) {
        this.logger.log('No events starting in the next 7 days.');
        return;
      }

      for (const event of upcomingEvents) {
        const eventDate = new Date(event.startDate);
        eventDate.setHours(0, 0, 0, 0);

        const diffTime = eventDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysRemaining > 0 && daysRemaining <= 7) {
          const participants = await this.participantRepository.find({
            where: { eventId: event.id, hasAttended: false },
          });

          if (participants.length > 0) {
            this.logger.log(
              `Event "${event.title}" is ${daysRemaining} day(s) away. Notifying ${participants.length} participants.`,
            );

            // Dispatch notifications concurrently
            await Promise.allSettled(
              participants.map((participant) =>
                this.notificationService.send({
                  type: NotificationType.EVENT_COUNTDOWN_REMINDER,
                  channels: [DeliveryChannel.EMAIL, DeliveryChannel.SMS],
                  recipient: {
                    email: participant.email,
                    phone: participant.phone ?? undefined,
                    name: participant.firstName,
                  },
                  context: {
                    firstName: participant.firstName,
                    eventName: event.title,
                    eventDate: `${event.startDate} - ${event.endDate}`,
                    eventTime: event.dailySchedule ?? undefined,
                    location: event.location,
                    daysRemaining,
                    timeRemaining: `${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
                    year: new Date().getFullYear(),
                  },
                }),
              ),
            );
          }
        }
      }
      this.logger.log('Daily event countdown cron job completed successfully.');
    } catch (error) {
      this.logger.error(
        `Error executing daily countdown cron: ${(error as Error).message}`,
      );
    }
  }
}
