import { NotificationType } from '../types/notification-types.js';

export interface INotificationTemplateProvider {
  /** The notification type this provider handles */
  readonly type: NotificationType;
  
  /** Handlebars template name (without .hbs extension) */
  readonly emailTemplate: string;
  
  /** Static subject string or a function that builds one from context */
  getSubject(context: Record<string, unknown>): string;
  
  /** Optional SMS body builder — if returns null/undefined, SMS is skipped */
  getSmsBody?(context: Record<string, unknown>): string | null;
}
