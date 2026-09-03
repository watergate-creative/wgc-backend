import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeliveryChannel } from '../types/notification-types.js';
import {
  IDeliveryChannel,
  ChannelPayload,
  DeliveryResult,
} from './delivery-channel.interface.js';

@Injectable()
export class RcsChannel implements IDeliveryChannel {
  readonly channel = DeliveryChannel.RCS;
  private readonly logger = new Logger(RcsChannel.name);
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GOOGLE_RCS_API_KEY', '');

    if (!this.apiKey) {
      this.logger.warn(
        'GOOGLE_RCS_API_KEY is not configured. RCS notifications will be skipped.',
      );
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
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

    this.logger.log(
      `[RCS STUB] Would send to ${recipient.phone}: ${smsBody ?? '(no body)'}`,
    );

    return {
      success: false,
      channel: this.channel,
      error: 'RCS channel is not yet implemented — message was logged only',
    };
  }
}
