export const MAIL_QUEUE = 'MAIL_QUEUE';
export const SEND_EMAIL_JOB = 'SEND_EMAIL_JOB';

export interface SendEmailJobPayload {
  to: string;
  subject: string;
  template: string; // e.g., 'welcome'
  context: Record<string, any>;
}

/**
 * Supported mail providers.
 * Set via the MAIL_PROVIDER env var (defaults to 'gmail').
 */
export enum MailProvider {
  GMAIL = 'gmail',
  ZEPTOMAIL = 'zeptomail',
}