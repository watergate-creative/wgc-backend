export interface IMailProviderStrategy {
  readonly name: string;
  sendMail(options: { from: string; to: string; subject: string; html: string }): Promise<void>;
  getSenderAddress(): string;
  isAvailable(): boolean;
}

export const MAIL_PROVIDER_STRATEGY = 'MAIL_PROVIDER_STRATEGY';
