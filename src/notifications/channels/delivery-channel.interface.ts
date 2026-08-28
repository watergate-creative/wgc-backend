import { DeliveryChannel } from '../types/notification-types.js';

// ─── CHANNEL PAYLOAD ────────────────────────────────────────────

/**
 * Unified shape handed to every channel implementation.
 * Each channel extracts the fields it needs (e.g. email ignores `phone`,
 * SMS ignores `template`/`subject`).
 */
export interface ChannelPayload {
  recipient: {
    email?: string;
    phone?: string;
    name: string;
  };
  /** Email subject line (email channel only) */
  subject?: string;
  /** Handlebars template name without extension (email channel only) */
  template?: string;
  /** Template context / variables */
  context: Record<string, unknown>;
  /** Pre-rendered SMS body (SMS / RCS channels) */
  smsBody?: string;
}

// ─── DELIVERY RESULT ────────────────────────────────────────────

export interface DeliveryResult {
  success: boolean;
  channel: DeliveryChannel;
  messageId?: string;
  error?: string;
}

// ─── DELIVERY CHANNEL CONTRACT ──────────────────────────────────

/**
 * Strategy interface — every delivery channel (email, SMS, RCS, push …)
 * must implement this contract.
 *
 * The orchestrator iterates over all registered channels, skips those
 * that report `isAvailable() === false`, and calls `send()` on the rest.
 */
export interface IDeliveryChannel {
  /** Which channel this implementation handles */
  readonly channel: DeliveryChannel;

  /**
   * Send a notification through this channel.
   * Implementations should NOT throw — return a failed `DeliveryResult` instead.
   */
  send(payload: ChannelPayload): Promise<DeliveryResult>;

  /**
   * Returns `true` when the channel is properly configured and ready.
   * E.g. returns `false` when API keys are missing so the orchestrator
   * can gracefully skip it.
   */
  isAvailable(): boolean;
}
