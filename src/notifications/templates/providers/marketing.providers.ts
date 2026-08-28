import { Injectable } from '@nestjs/common';
import { NotificationType } from '../../types/notification-types.js';
import { INotificationTemplateProvider } from '../template-provider.interface.js';

@Injectable()
export class UpcomingProgramAnnouncementProvider implements INotificationTemplateProvider {
  readonly type = NotificationType.UPCOMING_PROGRAM_ANNOUNCEMENT;
  readonly emailTemplate = 'upcoming-program-announcement';

  getSubject(ctx: Record<string, unknown>): string {
    return `Upcoming: ${ctx['programName']}`;
  }

  getSmsBody(ctx: Record<string, unknown>): string {
    return `📣 ${ctx['programName']} is coming up! ${ctx['startDate']} at ${ctx['location']}. Don't miss it! - WGC`;
  }
}

@Injectable()
export class NewWeekWishesProvider implements INotificationTemplateProvider {
  readonly type = NotificationType.NEW_WEEK_WISHES;
  readonly emailTemplate = 'new-week-wishes';

  getSubject(): string {
    return '🌟 Happy New Week from Watergate Church!';
  }
}

@Injectable()
export class NewMonthWishesProvider implements INotificationTemplateProvider {
  readonly type = NotificationType.NEW_MONTH_WISHES;
  readonly emailTemplate = 'new-month-wishes';

  getSubject(ctx: Record<string, unknown>): string {
    return `🎉 Happy New Month of ${ctx['monthName']}!`;
  }
}

@Injectable()
export class NewsletterProvider implements INotificationTemplateProvider {
  readonly type = NotificationType.NEWSLETTER;
  readonly emailTemplate = 'newsletter';

  getSubject(ctx: Record<string, unknown>): string {
    return String(ctx['subject']);
  }
}
