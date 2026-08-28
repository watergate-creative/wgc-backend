import { Injectable, Logger } from '@nestjs/common';
import { DeliveryChannel } from '../types/notification-types.js';
import {
  IDeliveryChannel,
  ChannelPayload,
  DeliveryResult,
} from './delivery-channel.interface.js';
import { MailService } from '../../email/mail.service.js';

/**
 * Email delivery channel.
 *
 * Delegates to the existing `MailService` which enqueues jobs onto
 * BullMQ for async processing by `MailProcessor`.
 */
@Injectable()
export class EmailChannel implements IDeliveryChannel {
  readonly channel = DeliveryChannel.EMAIL;
  private readonly logger = new Logger(EmailChannel.name);

  constructor(private readonly mailService: MailService) {}

  isAvailable(): boolean {
    // Email infrastructure is always available (Gmail / ZeptoMail)
    return true;
  }

  async send(payload: ChannelPayload): Promise<DeliveryResult> {
    const { recipient, subject, template, context } = payload;

    if (!recipient.email) {
      return {
        success: false,
        channel: this.channel,
        error: 'No email address provided',
      };
    }

    if (!template || !subject) {
      return {
        success: false,
        channel: this.channel,
        error: 'Email channel requires both template and subject',
      };
    }

    try {
      await this.mailService.queueEmail({
        to: recipient.email,
        subject,
        template,
        context,
      });

      this.logger.debug(`Email queued for ${recipient.email}`);

      return {
        success: true,
        channel: this.channel,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to queue email for ${recipient.email}: ${message}`);

      return {
        success: false,
        channel: this.channel,
        error: message,
      };
    }
  }
}
