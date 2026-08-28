import { Injectable } from '@nestjs/common';
import { NotificationType } from '../../types/notification-types.js';
import { INotificationTemplateProvider } from '../template-provider.interface.js';

@Injectable()
export class EventRegistrationConfirmationProvider implements INotificationTemplateProvider {
  readonly type = NotificationType.EVENT_REGISTRATION_CONFIRMATION;
  readonly emailTemplate = 'registration-confirmation';

  getSubject(ctx: Record<string, unknown>): string {
    return `${String(ctx['title']).toUpperCase()} REGISTRATION SUCCESSFUL`;
  }

  getSmsBody(ctx: Record<string, unknown>): string {
    return `Hi ${ctx['firstName']}, your registration for ${ctx['title']} is confirmed. We look forward to seeing you! - WGC`;
  }
}

@Injectable()
export class SessionBookingConfirmationProvider implements INotificationTemplateProvider {
  readonly type = NotificationType.SESSION_BOOKING_CONFIRMATION;
  readonly emailTemplate = 'session-booking-confirmation';

  getSubject(): string {
    return 'Session Booking Confirmed';
  }

  getSmsBody(ctx: Record<string, unknown>): string {
    return `Hi ${ctx['guestName']}, your session with ${ctx['ministerName']} on ${ctx['sessionDate']} at ${ctx['sessionTime']} is confirmed. - WGC`;
  }
}

@Injectable()
export class SessionCancellationProvider implements INotificationTemplateProvider {
  readonly type = NotificationType.SESSION_CANCELLATION;
  readonly emailTemplate = 'session-cancellation';

  getSubject(): string {
    return 'Session Cancelled';
  }

  getSmsBody(ctx: Record<string, unknown>): string {
    return `Hi ${ctx['guestName']}, your session with ${ctx['ministerName']} on ${ctx['sessionDate']} has been cancelled. Please rebook at your convenience. - WGC`;
  }
}

@Injectable()
export class FormSubmissionAcknowledgementProvider implements INotificationTemplateProvider {
  readonly type = NotificationType.FORM_SUBMISSION_ACKNOWLEDGEMENT;
  readonly emailTemplate = 'form-notification';

  getSubject(): string {
    return 'We Received Your Feedback';
  }

  getSmsBody(ctx: Record<string, unknown>): string {
    const messages: Record<string, string> = {
      Volunteer: `Hi ${ctx['fullName']}, thank you for signing up to volunteer at WaterGate Church! Our team will reach out to you shortly.`,
      'Naming Ceremony': `Hi ${ctx['fullName']}, your naming ceremony registration has been received. We will contact you to confirm the details.`,
      'New Comers': `Hi ${ctx['fullName']}, welcome to WaterGate Church! We are so glad you connected with us. Expect a follow-up from our team.`,
      'Altar Call': `Hi ${ctx['fullName']}, what a beautiful decision! We are here to support you. Someone from our pastoral team will be in touch.`,
      'Pre-Marital Counselling': `Hi ${ctx['fullName']}, your pre-marital counselling registration has been received. Our counselling team will reach out to schedule your sessions.`,
      Counselling: `Hi ${ctx['fullName']}, your counselling request has been received. A member of our team will contact you to arrange a session.`,
      Feedback: `Hi ${ctx['fullName']}, thank you for your feedback! Your thoughts help us serve better.`,
      Testimony: `Hi ${ctx['fullName']}, thank you for sharing your testimony! Your story is an encouragement to us all.`,
    };
    return (
      messages[ctx['formType'] as string] ??
      `Hi ${ctx['fullName']}, your form submission has been received. Thank you!`
    );
  }
}

@Injectable()
export class EventCountdownReminderProvider implements INotificationTemplateProvider {
  readonly type = NotificationType.EVENT_COUNTDOWN_REMINDER;
  readonly emailTemplate = 'event-countdown';

  getSubject(ctx: Record<string, unknown>): string {
    return `${ctx['eventName']} — ${ctx['daysRemaining']} Day${Number(ctx['daysRemaining']) === 1 ? '' : 's'} to Go!`;
  }

  getSmsBody(ctx: Record<string, unknown>): string {
    const days = Number(ctx['daysRemaining']);
    const dayWord = days === 1 ? 'day' : 'days';
    return `Hi ${ctx['firstName']}! ${ctx['eventName']} is ${days} ${dayWord} away. See you at ${ctx['location']}. - WGC`;
  }
}
