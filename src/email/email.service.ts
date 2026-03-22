import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface EventEmailDetails {
  firstName: string;
  eventTitle: string;
  startDate: Date;
  endDate: Date;
  startTime?: string;
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

  async sendRegistrationConfirmation(
    to: string,
    details: EventEmailDetails,
  ): Promise<void> {
    const startDate = new Date(details.startDate).toLocaleDateString('en-NG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const endDate = new Date(details.endDate).toLocaleDateString('en-NG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const subject = `Registration Confirmed: ${details.eventTitle} 🎉`;
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
          body { font-family: 'Inter', Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
          .wrapper { width: 100%; table-layout: fixed; background-color: #f3f4f6; padding: 40px 0; }
          .main { background-color: #ffffff; max-width: 600px; margin: 0 auto; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
          .hero { background: linear-gradient(135deg, #111827, #374151); padding: 48px 32px; text-align: center; color: #ffffff; }
          .hero h1 { margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
          .hero p { margin: 12px 0 0; font-size: 16px; color: #9ca3af; }
          .content { padding: 40px 32px; color: #1f2937; line-height: 1.6; }
          .content h2 { color: #111827; font-size: 20px; font-weight: 600; margin-top: 0; }
          .event-card { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 6px solid #3b82f6; }
          .event-card ul { list-style: none; padding: 0; margin: 0; }
          .event-card li { padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-size: 15px; display: flex; align-items: flex-start; }
          .event-card li:last-child { border-bottom: none; padding-bottom: 0; }
          .event-card strong { color: #111827; min-width: 90px; display: inline-block; }
          .cta-box { text-align: center; margin: 32px 0; }
          .cta-button { display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background-color 0.2s; }
          .footer { background-color: #f9fafb; padding: 32px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="main">
            <div class="hero">
              <h1>${this.appName}</h1>
              <p>Registration Confirmed</p>
            </div>
            <div class="content">
              <h2>Hello ${details.firstName},</h2>
              <p>You're all set! Your registration for <strong>${details.eventTitle}</strong> has been successfully confirmed. We are thrilled to host you and believe God is preparing something special for this event.</p>
              
              <div class="event-card">
                <ul>
                  <li><strong>📅 Date:</strong> <span>${startDate} ${startDate !== endDate ? ` — ${endDate}` : ''}</span></li>
                  ${details.startTime ? `<li><strong>🕘 Time:</strong> <span>${details.startTime}</span></li>` : ''}
                  <li><strong>📍 Venue:</strong> <span>${details.location}</span></li>
                  ${details.address ? `<li><strong>🗺️ Address:</strong> <span>${details.address}</span></li>` : ''}
                </ul>
              </div>

              <div class="cta-box">
                <a href="#" class="cta-button">Mark Your Calendar</a>
              </div>

              <p>If you have any questions or need special accommodations, please don't hesitate to reach out to our team.</p>
              <p>Prepared with joy,<br><strong>The ${this.appName} Team</strong> 🕊️</p>
            </div>
            <div class="footer">
              <p>You received this email because you registered for an event at ${this.appName}.</p>
              <p>&copy; ${new Date().getFullYear()} ${this.appName}. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendMail(to, subject, html);
  }

  async sendEventReminder(
    to: string,
    details: EventEmailDetails,
  ): Promise<void> {
    const startDate = new Date(details.startDate).toLocaleDateString('en-NG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const subject = `Reminder: ${details.eventTitle} is coming up!`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f4f7; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #e65100, #f57c00); color: #ffffff; text-align: center; padding: 36px 24px; }
          .header h1 { margin: 0; font-size: 22px; }
          .body { padding: 32px 24px; color: #333; }
          .body h2 { color: #e65100; }
          .detail { background: #fff3e0; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #e65100; }
          .detail p { margin: 6px 0; font-size: 14px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #999; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📢 Event Reminder</h1>
          </div>
          <div class="body">
            <h2>Hello ${details.firstName},</h2>
            <p>This is a friendly reminder that <strong>${details.eventTitle}</strong> is coming up soon!</p>
            <div class="detail">
              <p><strong>📅 Date:</strong> ${startDate}</p>
              ${details.startTime ? `<p><strong>🕘 Time:</strong> ${details.startTime}</p>` : ''}
              <p><strong>📍 Location:</strong> ${details.location}</p>
              ${details.address ? `<p><strong>🗺️ Address:</strong> ${details.address}</p>` : ''}
            </div>
            <p>We can't wait to see you there! God bless you! 🙏</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${this.appName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendMail(to, subject, html);
  }

  async sendWelcomeEmail(to: string, firstName: string): Promise<void> {
    const subject = `Welcome to ${this.appName}!`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f4f7; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #1a237e, #283593); color: #ffffff; text-align: center; padding: 36px 24px; }
          .header h1 { margin: 0; font-size: 22px; }
          .body { padding: 32px 24px; color: #333; }
          .body h2 { color: #1a237e; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #999; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ${this.appName}!</h1>
          </div>
          <div class="body">
            <h2>Hello ${firstName},</h2>
            <p>Welcome to ${this.appName}! Your account has been created successfully.</p>
            <p>You can now browse our events, register for upcoming programs, and stay connected with our community.</p>
            <p>God bless you! 🙏</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${this.appName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendMail(to, subject, html);
  }

  async sendCountdownEmail(
    to: string,
    details: EventEmailDetails,
    daysRemaining: number,
  ): Promise<void> {
    const startDate = new Date(details.startDate).toLocaleDateString('en-NG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const subject = `Countdown: Only ${daysRemaining} day${daysRemaining > 1 ? 's' : ''} until ${details.eventTitle}!`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f4f7; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #004d40, #00796b); color: #ffffff; text-align: center; padding: 36px 24px; }
          .header h1 { margin: 0; font-size: 28px; }
          .body { padding: 32px 24px; color: #333; }
          .body h2 { color: #004d40; }
          .countdown { text-align: center; margin: 24px 0; padding: 20px; background: #e0f2f1; border-radius: 8px; font-size: 24px; font-weight: bold; color: #004d40; border: 2px dashed #00796b; }
          .detail { background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #004d40; }
          .detail p { margin: 6px 0; font-size: 14px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #999; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏳ ${daysRemaining} Day${daysRemaining > 1 ? 's' : ''} to Go!</h1>
          </div>
          <div class="body">
            <h2>Hello ${details.firstName},</h2>
            <p>The highly anticipated <strong>${details.eventTitle}</strong> is just around the corner!</p>
            <div class="countdown">
              ${daysRemaining} Day${daysRemaining > 1 ? 's' : ''} Remaining
            </div>
            <div class="detail">
              <p><strong>📅 Date:</strong> ${startDate}</p>
              ${details.startTime ? `<p><strong>🕘 Time:</strong> ${details.startTime}</p>` : ''}
              <p><strong>📍 Location:</strong> ${details.location}</p>
              ${details.address ? `<p><strong>🗺️ Address:</strong> ${details.address}</p>` : ''}
            </div>
            <p>Please prepare your heart, invite a friend, and get ready for a mighty move of God. We can't wait to host you!</p>
            <p>God bless you! 🙏</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${this.appName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendMail(to, subject, html);
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
      // Do NOT throw — email failures should never break the request flow
    }
  }
}

