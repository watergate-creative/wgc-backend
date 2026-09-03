import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { NotificationType } from '../types/notification-types.js';
import { INotificationTemplateProvider } from './template-provider.interface.js';

export const NOTIFICATION_TEMPLATE_PROVIDERS = 'NOTIFICATION_TEMPLATE_PROVIDERS';

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

  
  getSmsBody(
    type: NotificationType,
    context: Record<string, unknown>,
  ): string | null {
    const provider = this.templates.get(type);
    if (!provider || !provider.getSmsBody) return null;
    return provider.getSmsBody(context) || null;
  }

  
  has(type: NotificationType): boolean {
    return this.templates.has(type);
  }
}
