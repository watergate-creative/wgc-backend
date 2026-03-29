import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  registrationConfirmationTemplate,
  eventReminderTemplate,
  welcomeTemplate,
  countdownTemplate,
  formSubmissionTemplate,
  getFormSubject,
} from './templates/index.js';

export interface EventEmailDetails {
  firstName: string;
  eventTitle: string;
  startDate: Date;
  endDate: Date;
  dailySchedule?: string;
  location: string;
  address?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private readonly fromAddress: string;
  private readonly appName: string;

  constructor(private readonly configService: ConfigService) {
    this.appName = this.configService.get('APP_NAME', 'WaterGate Church');
    this.fromAddress = this.configService.get(
      'SMTP_FROM',
      `"${this.appName}" <noreply@watergatechurch.org>`,
    );

    const host = this.configService.get('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.configService.get<number>('SMTP_PORT', 587),
        secure: this.configService.get('SMTP_SECURE', 'false') === 'true',
        auth: {
          user: this.configService.get('SMTP_USER'),
          pass: this.configService.get('SMTP_PASS'),
        },
      });
      this.logger.log('Email transporter configured');
    } else {
      this.logger.warn(
        'SMTP is not configured. Emails will be logged but not sent. Set SMTP_HOST to enable.',
      );
    }
  }

  // ─── FORM SUBMISSION EMAIL (throws on failure for SMS fallback) ──

  async sendFormSubmissionEmail(
    to: string,
    details: {
      fullName: string;
      formType: string;
      data?: Record<string, unknown>;
    },
  ): Promise<void> {
    const subject = getFormSubject(details.formType, this.appName);
    const html = formSubmissionTemplate({
      appName: this.appName,
      fullName: details.fullName,
      formType: details.formType,
      data: details.data,
    });

    if (!this.transporter) {
      throw new Error('SMTP not configured');
    }

    const info = await this.transporter.sendMail({
      from: this.fromAddress,
      to,
      subject,
      html,
    });

    this.logger.log(`Form submission email sent to ${to}: ${info.messageId}`);
  }

  // ─── REGISTRATION CONFIRMATION ────────────────────────────────

  async sendRegistrationConfirmation(
    to: string,
    details: EventEmailDetails,
  ): Promise<void> {
    const startDate = this.formatDate(details.startDate);
    const endDate = this.formatDate(details.endDate);

    const subject = `Registration Confirmed: ${details.eventTitle} 🎉`;
    const html = registrationConfirmationTemplate({
      appName: this.appName,
      firstName: details.firstName,
      eventTitle: details.eventTitle,
      startDate,
      endDate,
      dailySchedule: details.dailySchedule,
      location: details.location,
      address: details.address,
    });

    await this.sendMail(to, subject, html);
  }

  // ─── EVENT REMINDER ───────────────────────────────────────────

  async sendEventReminder(
    to: string,
    details: EventEmailDetails,
  ): Promise<void> {
    const startDate = this.formatDate(details.startDate);

    const subject = `Reminder: ${details.eventTitle} is coming up!`;
    const html = eventReminderTemplate({
      appName: this.appName,
      firstName: details.firstName,
      eventTitle: details.eventTitle,
      startDate,
      dailySchedule: details.dailySchedule,
      location: details.location,
      address: details.address,
    });

    await this.sendMail(to, subject, html);
  }

  // ─── WELCOME EMAIL ────────────────────────────────────────────

  async sendWelcomeEmail(to: string, firstName: string): Promise<void> {
    const subject = `Welcome to ${this.appName}!`;
    const html = welcomeTemplate({
      appName: this.appName,
      firstName,
    });

    await this.sendMail(to, subject, html);
  }

  // ─── COUNTDOWN EMAIL ─────────────────────────────────────────

  async sendCountdownEmail(
    to: string,
    details: EventEmailDetails,
    daysRemaining: number,
  ): Promise<void> {
    const startDate = this.formatDate(details.startDate);

    const subject = `Countdown: Only ${daysRemaining} day${daysRemaining > 1 ? 's' : ''} until ${details.eventTitle}!`;
    const html = countdownTemplate({
      appName: this.appName,
      firstName: details.firstName,
      eventTitle: details.eventTitle,
      startDate,
      daysRemaining,
      dailySchedule: details.dailySchedule,
      location: details.location,
      address: details.address,
    });

    await this.sendMail(to, subject, html);
  }

  // ─── HELPERS ──────────────────────────────────────────────────

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-NG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  private async sendMail(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.log(
        `[EMAIL NOT SENT - SMTP not configured] To: ${to} | Subject: ${subject}`,
      );
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}: ${info.messageId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${to}: ${(error as Error).message}`,
      );
    }
  }
}
