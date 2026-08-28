import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { NotificationType } from '../types/notification-types.js';
import { INotificationTemplateProvider } from './template-provider.interface.js';

export const NOTIFICATION_TEMPLATE_PROVIDERS = 'NOTIFICATION_TEMPLATE_PROVIDERS';

/**
 * Single source of truth for notification → template / subject / SMS mappings.
 *
 * Adding a new notification type requires:
 * 1. Add the enum value to `NotificationType`
 * 2. Add the typed context to `NotificationContextMap`
 * 3. Create a provider class implementing `INotificationTemplateProvider`
 * 4. Register the provider in `notifications.module.ts` under `NOTIFICATION_TEMPLATE_PROVIDERS`
 * 5. Create the `.hbs` file in `src/email/templates/`
 */
@Injectable()
export class NotificationTemplateRegistry implements OnModuleInit {
  private readonly templates = new Map<NotificationType, INotificationTemplateProvider>();

  constructor(
    @Inject(NOTIFICATION_TEMPLATE_PROVIDERS)
    private readonly providers: INotificationTemplateProvider[],
  ) {}

  onModuleInit() {
    for (const provider of this.providers) {
      this.templates.set(provider.type, provider);
    }
  }

  // ─── PUBLIC API ─────────────────────────────────────────────

  /**
   * Resolves the email template name and subject line for a notification type.
   */
  getEmailConfig(
    type: NotificationType,
    context: Record<string, unknown>,
  ): { template: string; subject: string } {
    const provider = this.templates.get(type);
    if (!provider) {
      throw new Error(`No template provider registered for notification type: ${type}`);
    }

    const subject = provider.getSubject(context);

    return { template: provider.emailTemplate, subject };
  }

  /**
   * Builds the SMS body for a notification type.
   * Returns `null` if the type has no SMS template configured.
   */
  getSmsBody(
    type: NotificationType,
    context: Record<string, unknown>,
  ): string | null {
    const provider = this.templates.get(type);
    if (!provider || !provider.getSmsBody) return null;
    return provider.getSmsBody(context) || null;
  }

  /**
   * Returns `true` if the given type has a registered template config.
   */
  has(type: NotificationType): boolean {
    return this.templates.has(type);
  }
}
