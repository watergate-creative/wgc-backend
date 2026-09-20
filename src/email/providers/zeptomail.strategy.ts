import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IMailProviderStrategy } from './mail-provider.interface.js';

@Injectable()
export class ZeptomailStrategy implements IMailProviderStrategy {
  readonly name = 'zeptomail';
  private readonly logger = new Logger(ZeptomailStrategy.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    if (this.isAvailable()) {
      this.transporter = nodemailer.createTransport({
        host: this.configService.getOrThrow<string>('SMTP_HOST'),
        port: this.configService.get<number>('SMTP_PORT', 587),
        secure: this.configService.get<string>('SMTP_SECURE') === 'true',
        auth: {
          user: this.configService.getOrThrow<string>('SMTP_USER'),
          pass: this.configService.getOrThrow<string>('SMTP_PASS'),
        },
      });
    }
  }

  isAvailable(): boolean {
    return !!this.configService.get('SMTP_HOST');
  }

  getSenderAddress(): string {
    const appName = this.configService.get('APP_NAME') || 'Watergate Church Global';
    return `"${appName}" <${this.configService.get('SMTP_FROM', 'info@watergatechurch.org')}>`;
  }

  async sendMail(options: { from: string; to: string; subject: string; html: string }): Promise<void> {
    if (!this.transporter) {
      throw new Error('ZeptoMail transporter is not configured');
    }
    await this.transporter.sendMail(options);
  }
}
