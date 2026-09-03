import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DeliveryChannel } from '../types/notification-types.js';
import {
  IDeliveryChannel,
  ChannelPayload,
  DeliveryResult,
} from './delivery-channel.interface.js';
import { TermiiService } from '../termii.service.js';
import { SMS_QUEUE, SEND_SMS_JOB, SendSmsJobPayload } from '../sms.constants.js';

@Injectable()
export class SmsChannel implements IDeliveryChannel {
  readonly channel = DeliveryChannel.SMS;
  private readonly logger = new Logger(SmsChannel.name);

  constructor(
    private readonly termiiService: TermiiService,
    @InjectQueue(SMS_QUEUE) private readonly smsQueue: Queue,
  ) {}

  isAvailable(): boolean {

    return this.termiiService.isConfigured();
  }

  async send(payload: ChannelPayload): Promise<DeliveryResult> {
    const { recipient, smsBody } = payload;

    if (!recipient.phone) {
      return {
        success: false,
        channel: this.channel,
        error: 'No phone number provided',
      };
    }

    if (!smsBody) {
      return {
        success: false,
        channel: this.channel,
        error: 'No SMS body provided',
      };
    }

    try {
      await this.smsQueue.add(
        SEND_SMS_JOB,
        {
          to: recipient.phone,
          sms: smsBody,
        } as SendSmsJobPayload,
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: {
            age: 7 * 24 * 3600, // 7 days in seconds
            count: 1000,
          },
        },
      );

      this.logger.debug(`SMS queued for ${recipient.phone}`);

      return {
        success: true,
        channel: this.channel,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to queue SMS for ${recipient.phone}: ${message}`);

      return {
        success: false,
        channel: this.channel,
        error: message,
      };
    }
  }
}
