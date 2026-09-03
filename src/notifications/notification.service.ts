import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationType,
  NotificationPayload,
  BroadcastPayload,
  DeliveryChannel,
  DeliveryResult,
} from './types/notification-types.js';
import { NotificationOrchestrator } from './notification.orchestrator.js';
import { AudienceResolver } from './audience/audience-resolver.js';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly orchestrator: NotificationOrchestrator,
    private readonly audienceResolver: AudienceResolver,
  ) {}

  
  async send<T extends NotificationType>(
    payload: NotificationPayload<T>,
  ): Promise<DeliveryResult[]> {
    const { type, channels, recipient, context } = payload;

    this.logger.debug(
      `Sending ${type} to ${recipient.email ?? recipient.phone}`,
    );

    return this.orchestrator.dispatch(
      type,
      recipient,
      context as unknown as Record<string, unknown>,
      channels,
    );
  }

  
  async broadcast<T extends NotificationType>(
    payload: BroadcastPayload<T>,
  ): Promise<{ totalRecipients: number; results: DeliveryResult[] }> {
    const { type, channels, context, audienceFilter } = payload;

    const recipients = await this.audienceResolver.resolve(audienceFilter ?? {});

    if (recipients.length === 0) {
      this.logger.warn(`Broadcast ${type}: no recipients matched the filter`);
      return { totalRecipients: 0, results: [] };
    }

    this.logger.log(
      `Broadcasting ${type} to ${recipients.length} recipients via [${(channels ?? [DeliveryChannel.EMAIL]).join(', ')}]`,
    );

    const BATCH_SIZE = 50;
    const allResults: DeliveryResult[] = [];

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map((recipient) => {

          const personalizedContext = {
            ...(context as Record<string, unknown>),
            recipientName: recipient.name,
          };

          return this.orchestrator.dispatch(
            type,
            recipient,
            personalizedContext,
            channels,
          );
        }),
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          allResults.push(...result.value);
        } else {
          this.logger.error(
            `Broadcast dispatch failed: ${result.reason}`,
          );
        }
      }
    }

    const successCount = allResults.filter((r) => r.success).length;
    this.logger.log(
      `Broadcast ${type} complete: ${successCount}/${allResults.length} deliveries successful`,
    );

    return { totalRecipients: recipients.length, results: allResults };
  }
}
