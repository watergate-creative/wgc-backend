

export enum DeliveryChannel {
  EMAIL = 'email',
  SMS = 'sms',
  RCS = 'rcs',

}

export enum NotificationType {

  EVENT_REGISTRATION_CONFIRMATION = 'event_registration_confirmation',
  SESSION_BOOKING_CONFIRMATION = 'session_booking_confirmation',
  FORM_SUBMISSION_ACKNOWLEDGEMENT = 'form_submission_acknowledgement',
  EVENT_COUNTDOWN_REMINDER = 'event_countdown_reminder',
  SESSION_CANCELLATION = 'session_cancellation',

  UPCOMING_PROGRAM_ANNOUNCEMENT = 'upcoming_program_announcement',
  NEW_WEEK_WISHES = 'new_week_wishes',
  NEW_MONTH_WISHES = 'new_month_wishes',
  NEWSLETTER = 'newsletter',
}

export interface NotificationContextMap {
  [NotificationType.EVENT_REGISTRATION_CONFIRMATION]: {
    firstName: string;
    bannerImageUrl?: string;
    startDate: Date | string;
    endDate: Date | string;
    selectedDays: string[];
    title: string;
    location: string;
    description?: string;
    registrationId: string;
    year?: number;
  };

  [NotificationType.SESSION_BOOKING_CONFIRMATION]: {
    guestName: string;
    ministerTitle: string;
    ministerName: string;
    sessionDate: string;
    sessionTime: string;
    durationMinutes: number;
    purpose: string;
    sessionId: string;
    year?: number;
  };

  [NotificationType.FORM_SUBMISSION_ACKNOWLEDGEMENT]: {
    fullName: string;
    formType: string;
    data?: Record<string, unknown>;
    year?: number;
  };

  [NotificationType.EVENT_COUNTDOWN_REMINDER]: {
    firstName: string;
    eventName: string;
    eventDate: string;
    eventTime?: string;
    location: string;
    daysRemaining: number;
    timeRemaining: string;
    year?: number;
  };

  [NotificationType.SESSION_CANCELLATION]: {
    guestName: string;
    ministerName: string;
    sessionDate: string;
    sessionTime: string;
    reason?: string;
    year?: number;
  };

  [NotificationType.UPCOMING_PROGRAM_ANNOUNCEMENT]: {
    programName: string;
    description: string;
    startDate: string;
    location: string;
    bannerImageUrl?: string;
    actionUrl?: string;
    year?: number;
  };

  [NotificationType.NEW_WEEK_WISHES]: {
    recipientName: string;
    weekMessage?: string;
    bibleVerse?: string;
    bibleReference?: string;
    year?: number;
  };

  [NotificationType.NEW_MONTH_WISHES]: {
    recipientName: string;
    monthName: string;
    monthMessage?: string;
    bibleVerse?: string;
    bibleReference?: string;
    year?: number;
  };

  [NotificationType.NEWSLETTER]: {
    subject: string;
    htmlContent: string;
    preheader?: string;
    year?: number;
  };
}

export interface NotificationRecipient {
  email?: string;
  phone?: string;
  name: string;
}

export interface NotificationPayload<T extends NotificationType = NotificationType> {
  type: T;
  channels?: DeliveryChannel[];
  recipient: NotificationRecipient;
  context: NotificationContextMap[T];
  metadata?: Record<string, unknown>;
}

export interface BroadcastPayload<T extends NotificationType = NotificationType> {
  type: T;
  channels?: DeliveryChannel[];
  context: NotificationContextMap[T];
  audienceFilter?: AudienceFilter;
}

export interface AudienceFilter {
  
  eventId?: string;
  
  hasContactConsent?: boolean;
  
  hasAttended?: boolean;
}

export interface DeliveryResult {
  success: boolean;
  channel: DeliveryChannel;
  recipientEmail?: string;
  recipientPhone?: string;
  messageId?: string;
  error?: string;
}
