import { NotificationType } from '../types/notification-types.js';

export interface INotificationTemplateProvider {
  
  readonly type: NotificationType;
  
  
  readonly emailTemplate: string;
  
  
  getSubject(context: Record<string, unknown>): string;
  
  
  getSmsBody?(context: Record<string, unknown>): string | null;
}
