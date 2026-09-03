import { DeliveryChannel } from '../types/notification-types.js';

export interface ChannelPayload {
  recipient: {
    email?: string;
    phone?: string;
    name: string;
  };
  
  subject?: string;
  
  template?: string;
  
  context: Record<string, unknown>;
  
  smsBody?: string;
}

export interface DeliveryResult {
  success: boolean;
  channel: DeliveryChannel;
  messageId?: string;
  error?: string;
}

export interface IDeliveryChannel {
  
  readonly channel: DeliveryChannel;

  
  send(payload: ChannelPayload): Promise<DeliveryResult>;

  
  isAvailable(): boolean;
}
