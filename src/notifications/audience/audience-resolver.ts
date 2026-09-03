import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Participant } from '../../participant/entities/participant.entity.js';
import {
  AudienceFilter,
  NotificationRecipient,
} from '../types/notification-types.js';

@Injectable()
export class AudienceResolver {
  private readonly logger = new Logger(AudienceResolver.name);

  constructor(
    @InjectRepository(Participant)
    private readonly participantRepository: Repository<Participant>,
  ) {}

  
  async resolve(filter: AudienceFilter = {}): Promise<NotificationRecipient[]> {
    const qb: SelectQueryBuilder<Participant> = this.participantRepository
      .createQueryBuilder('p')
      .select(['p.firstName', 'p.email', 'p.phone']);

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

    qb.andWhere('p.deletedAt IS NULL');

    const participants = await qb.getMany();

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
