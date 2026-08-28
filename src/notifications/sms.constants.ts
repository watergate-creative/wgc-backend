export const SMS_QUEUE = 'SMS_QUEUE';
export const SEND_SMS_JOB = 'SEND_SMS_JOB';

export interface SendSmsJobPayload {
  to: string;
  sms: string;
}
