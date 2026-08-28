import { BaseEntity } from '../../common/entities/base.entities.js';
import { Column, Entity, Index } from 'typeorm';
import {
  DeliveryChannel,
  NotificationType,
} from '../types/notification-types.js';

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
}

/**
 * Audit trail for every notification dispatched by the system.
 * Enables admin dashboards, delivery reporting, and debugging.
 */
@Entity('NotificationLogs')
export class NotificationLog extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  @Index()
  type: NotificationType;

  @Column({ type: 'varchar', length: 20 })
  channel: DeliveryChannel;

  @Column({ type: 'varchar', length: 300 })
  @Index()
  recipientEmail: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  recipientPhone?: string;

  @Column({ type: 'varchar', length: 500 })
  subject: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: NotificationStatus.PENDING,
  })
  @Index()
  status: NotificationStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  messageId?: string;
}
