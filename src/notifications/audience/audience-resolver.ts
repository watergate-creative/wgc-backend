import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Participant } from '../../participant/entities/participant.entity.js';
import {
  AudienceFilter,
  NotificationRecipient,
} from '../types/notification-types.js';

/**
 * Resolves recipients for broadcast notifications.
 *
 * Currently queries the `Participant` table (Option A from the plan).
 * When a dedicated `Subscriber` entity is added in the future,
 * this resolver can be extended with a union query.
 */
@Injectable()
export class AudienceResolver {
  private readonly logger = new Logger(AudienceResolver.name);

  constructor(
    @InjectRepository(Participant)
    private readonly participantRepository: Repository<Participant>,
  ) {}

  /**
   * Returns a deduplicated list of recipients matching the given filter.
   * Deduplication is by email address (case-insensitive).
   */
  async resolve(filter: AudienceFilter = {}): Promise<NotificationRecipient[]> {
    const qb: SelectQueryBuilder<Participant> = this.participantRepository
      .createQueryBuilder('p')
      .select(['p.firstName', 'p.email', 'p.phone']);

    // ── Apply filters ─────────────────────────────────────────

    if (filter.eventId) {
      qb.andWhere('p.eventId = :eventId', { eventId: filter.eventId });
    }

    if (filter.hasContactConsent !== undefined) {
      qb.andWhere('p.contactConsent = :consent', {
        consent: filter.hasContactConsent,
      });
    }

    if (filter.hasAttended !== undefined) {
      qb.andWhere('p.hasAttended = :attended', {
        attended: filter.hasAttended,
      });
    }

    // Exclude soft-deleted records
    qb.andWhere('p.deletedAt IS NULL');

    const participants = await qb.getMany();

    // ── Deduplicate by email ──────────────────────────────────

    const seen = new Set<string>();
    const recipients: NotificationRecipient[] = [];

    for (const p of participants) {
      const normalizedEmail = p.email.toLowerCase();
      if (seen.has(normalizedEmail)) continue;
      seen.add(normalizedEmail);

      recipients.push({
        email: normalizedEmail,
        phone: p.phone ?? undefined,
        name: p.firstName,
      });
    }

    this.logger.log(
      `Audience resolved: ${recipients.length} unique recipients (from ${participants.length} records)`,
    );

    return recipients;
  }
}
