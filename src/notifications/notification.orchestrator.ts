import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DeliveryChannel,
  NotificationType,
  NotificationRecipient,
} from './types/notification-types.js';
import {
  IDeliveryChannel,
  ChannelPayload,
  DeliveryResult,
} from './channels/delivery-channel.interface.js';
import { NotificationTemplateRegistry } from './templates/template-registry.js';
import {
  NotificationLog,
  NotificationStatus,
} from './entities/notification-log.entity.js';

/**
 * Routes notification payloads to the appropriate delivery channels,
 * resolves templates, and persists audit logs.
 *
 * This is the internal engine — domain modules should use the
 * `NotificationService` façade instead.
 */
@Injectable()
export class NotificationOrchestrator {
  private readonly logger = new Logger(NotificationOrchestrator.name);

  /** Channel lookup by enum for O(1) resolution */
  private readonly channelMap = new Map<DeliveryChannel, IDeliveryChannel>();

  constructor(
    @Inject('DELIVERY_CHANNELS')
    private readonly channels: IDeliveryChannel[],
    private readonly templateRegistry: NotificationTemplateRegistry,
    @InjectRepository(NotificationLog)
    private readonly logRepository: Repository<NotificationLog>,
  ) {
    // Index channels for fast lookup
    for (const ch of this.channels) {
      this.channelMap.set(ch.channel, ch);
    }

    this.logger.log(
      `Orchestrator initialised with channels: ${this.channels.map((c) => c.channel).join(', ')}`,
    );
  }

  // ─── DISPATCH (single recipient) ──────────────────────────────

  async dispatch(
    type: NotificationType,
    recipient: NotificationRecipient,
    context: Record<string, unknown>,
    requestedChannels?: DeliveryChannel[],
  ): Promise<DeliveryResult[]> {
    const channels = requestedChannels ?? [DeliveryChannel.EMAIL];
    const results: DeliveryResult[] = [];

    for (const channelType of channels) {
      const channel = this.channelMap.get(channelType);

      if (!channel) {
        this.logger.warn(`No implementation registered for channel: ${channelType}`);
        results.push({
          success: false,
          channel: channelType,
          error: `Channel ${channelType} not registered`,
        });
        continue;
      }

      if (!channel.isAvailable()) {
        this.logger.debug(`Channel ${channelType} is not available — skipping`);
        results.push({
          success: false,
          channel: channelType,
          error: `Channel ${channelType} is not configured`,
        });
        continue;
      }

      // Build the channel-specific payload
      const payload = this.buildChannelPayload(type, recipient, context, channelType);
      const result = await this.safeDispatch(channel, payload);
      results.push(result);

      // Persist audit log
      await this.persistLog(type, channelType, recipient, payload.subject ?? '', result);
    }

    return results;
  }

  // ─── PRIVATE HELPERS ──────────────────────────────────────────

  private buildChannelPayload(
    type: NotificationType,
    recipient: NotificationRecipient,
    context: Record<string, unknown>,
    channelType: DeliveryChannel,
  ): ChannelPayload {
    const payload: ChannelPayload = {
      recipient,
      context,
    };

    if (channelType === DeliveryChannel.EMAIL) {
      const { template, subject } = this.templateRegistry.getEmailConfig(type, context);
      payload.template = template;
      payload.subject = subject;
    }

    if (channelType === DeliveryChannel.SMS || channelType === DeliveryChannel.RCS) {
      const smsBody = this.templateRegistry.getSmsBody(type, context);
      if (smsBody) {
        payload.smsBody = smsBody;
      }
    }

    return payload;
  }

  /**
   * Wraps channel.send() so a single channel failure never
   * prevents other channels from being attempted.
   */
  private async safeDispatch(
    channel: IDeliveryChannel,
    payload: ChannelPayload,
  ): Promise<DeliveryResult> {
    try {
      return await channel.send(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Unhandled error in ${channel.channel} channel: ${message}`,
      );
      return {
        success: false,
        channel: channel.channel,
        error: message,
      };
    }
  }

  private async persistLog(
    type: NotificationType,
    channel: DeliveryChannel,
    recipient: NotificationRecipient,
    subject: string,
    result: DeliveryResult,
  ): Promise<void> {
    try {
      const log = this.logRepository.create({
        type,
        channel,
        recipientEmail: recipient.email ?? '',
        recipientPhone: recipient.phone ?? "",
        subject,
        status: result.success
          ? NotificationStatus.SENT
          : NotificationStatus.FAILED,
        errorMessage: result.error ?? "",
        messageId: result.messageId ?? "",
      });

      await this.logRepository.save(log);
    } catch (error) {
      // Never let log persistence failures block notification delivery
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to persist notification log: ${msg}`);
    }
  }
}
