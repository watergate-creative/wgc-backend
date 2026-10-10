import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IMailProviderStrategy } from './mail-provider.interface.js';

@Injectable()
export class ZeptomailStrategy implements IMailProviderStrategy {
  readonly name = 'zeptomail';
  private readonly logger = new Logger(ZeptomailStrategy.name);

  constructor(private readonly configService: ConfigService) {}

  isAvailable(): boolean {
    // We only need the pass (Send Mail Token) to use the REST API
    return !!this.configService.get('SMTP_PASS');
  }

  getSenderAddress(): string {
    const appName = this.configService.get('APP_NAME') || 'Watergate Church Global';
    return `"${appName}" <${this.configService.get('SMTP_FROM', 'info@watergatechurch.org')}>`;
  }

  async sendMail(options: { from: string; to: string; subject: string; html: string }): Promise<void> {
    const sendMailToken = this.configService.get<string>('SMTP_PASS');
    
    if (!sendMailToken) {
      throw new Error('ZeptoMail Send Mail Token (SMTP_PASS) is missing.');
    }

    // Parse the sender address to extract name and email
    const fromMatch = options.from.match(/"?([^"]*)"?\s*<([^>]+)>/);
    const fromName = fromMatch ? fromMatch[1].trim() : 'Watergate Church Global';
    const fromAddress = fromMatch ? fromMatch[2].trim() : this.configService.get('SMTP_FROM');

    const payload = {
      from: {
        address: fromAddress,
        name: fromName,
      },
      to: [
        {
          email_address: {
            address: options.to,
          },
        },
      ],
      subject: options.subject,
      htmlbody: options.html,
    };

    try {
      await axios.post('https://api.zeptomail.com/v1.1/email', payload, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Zoho-enczapikey ${sendMailToken}`,
        },
      });
    } catch (error: any) {
      this.logger.error(
        `ZeptoMail API Error: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`
      );
      throw error;
    }
  }
}
