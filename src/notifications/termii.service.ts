import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface SendSmsPayload {
  to: string;
  sms: string;
}

@Injectable()
export class TermiiService {
  private readonly logger = new Logger(TermiiService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly senderId: string;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get(
      'TERMII_API_URL',
      'https://api.ng.termii.com/api',
    );
    this.apiKey = this.configService.get<string>('TERMII_API_KEY', '');
    this.senderId = this.configService.get('TERMII_SENDER_ID', 'WGC');

    if (!this.apiKey) {
      this.logger.warn(
        'TERMII_API_KEY is not configured. SMS via Termii will be bypassed.',
      );
    }
  }

  async sendSms(payload: SendSmsPayload): Promise<void> {
    if (!this.apiKey) {
      this.logger.log(`[SMS NOT SENT - API Key missing] To: ${payload.to} | Message: ${payload.sms}`);
      return;
    }

    // Format phone number according to Termii requirements (must include country code, e.g., 234)
    // Here we'll do a very basic standardization assuming it's mostly Nigerian numbers.
    let formattedPhone = payload.to.replace(/\D/g, ''); // Remove non-digits
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '234' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.substring(1); // just remove the +
    }

    try {
      const response = await axios.post(`${this.apiUrl}/sms/send`, {
        to: formattedPhone,
        from: this.senderId,
        sms: payload.sms,
        type: 'plain',
        channel: 'generic',
        api_key: this.apiKey,
      });

      this.logger.log(
        `SMS sent to ${formattedPhone}. Message ID: ${response.data.message_id}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to send SMS to ${formattedPhone}: ${
          error.response?.data?.message || error.message
        }`,
      );
      // We do not throw exceptions for notification failures to avoid breaking the core business flow
    }
  }
}
