import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IMailProviderStrategy } from './mail-provider.interface.js';

@Injectable()
export class GmailStrategy implements IMailProviderStrategy {
  readonly name = 'gmail';
  private readonly logger = new Logger(GmailStrategy.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    if (this.isAvailable()) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: this.configService.getOrThrow<string>('GMAIL_USER'),
          pass: this.configService.getOrThrow<string>('GMAIL_APP_PASSWORD'),
        },
      });
    }
  }

  isAvailable(): boolean {
    return !!this.configService.get('GMAIL_USER') && !!this.configService.get('GMAIL_APP_PASSWORD');
  }

  getSenderAddress(): string {
    const appName = this.configService.get('APP_NAME') || 'Watergate Church Global';
    return `"${appName}" <${this.configService.get('GMAIL_USER')}>`;
  }

  async sendMail(options: { from: string; to: string; subject: string; html: string }): Promise<void> {
    if (!this.transporter) {
      throw new Error('Gmail transporter is not configured');
    }
    await this.transporter.sendMail(options);
  }
}
