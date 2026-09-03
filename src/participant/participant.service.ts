import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Participant } from './entities/participant.entity.js';
import { RegisterParticipantDto, BulkRegistrationDto, ParticipantQueryDto } from './dto/participant.dto.js';
import { EventsService } from '../events/events.service.js';
import { NotificationService } from '../notifications/notification.service.js';
import {
  NotificationType,
  DeliveryChannel,
} from '../notifications/types/notification-types.js';
import { EventStatus } from '../events/entities/event.entity.js';
import { ResilientRedisService } from '../infrastructure/redis/resilient-redis-service.js';
import { PARTICIPANT_CACHE, EVENT_CACHE } from '../common/redis/cache.constants.js';
import { createHash } from 'crypto';
import { ActivitiesService } from '../activities/activities.service.js';
import { ActivityAction } from '../activities/entities/activity-log.entity.js';

@Injectable()
export class ParticipantService {
  private readonly logger = new Logger(ParticipantService.name);

  constructor(
    @InjectRepository(Participant)
    private readonly participantRepository: Repository<Participant>,
    private readonly eventsService: EventsService,
    private readonly notificationService: NotificationService,
    private readonly redis: ResilientRedisService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  private hashQuery(params: Record<string, unknown>): string {
    const sorted = Object.keys(params)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        if (params[key] !== undefined && params[key] !== null) {
          acc[key] = params[key];
        }
        return acc;
      }, {});

    return createHash('sha256')
      .update(JSON.stringify(sorted))
      .digest('hex')
      .slice(0, 16);
  }

  
  private async invalidateParticipantCache(eventId: string): Promise<void> {
    await this.redis.deleteByPrefix(`${PARTICIPANT_CACHE.LIST_PREFIX}${eventId}`);
  }

  
  private async invalidateLookupCache(): Promise<void> {
    await this.redis.deleteByPrefix(PARTICIPANT_CACHE.LOOKUP_PREFIX);
  }

  
  private async invalidateEventCache(): Promise<void> {
    await this.redis.deleteByPrefix(EVENT_CACHE.NAMESPACE);
  }

  async register(
    eventId: string,
    dto: RegisterParticipantDto,
  ): Promise<Participant> {
    const event = await this.eventsService.findOne(eventId);

    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException('This event is not currently accepting registrations');
    }

    const email = dto.email.toLowerCase();

    const existing = await this.participantRepository.findOne({
      where: { eventId, email },
    });

    if (existing) {
      throw new ConflictException('You are already registered for this event');
    }

    const participant = this.participantRepository.create({
      ...dto,
      email,
      eventId,
    });

    const saved = await this.participantRepository.save(participant);
    await this.eventsService.incrementRegistrationCount(eventId);

    this.notificationService
      .send({
        type: NotificationType.EVENT_REGISTRATION_CONFIRMATION,
        channels: [DeliveryChannel.EMAIL, DeliveryChannel.SMS],
        recipient: {
          email,
          phone: dto.phone ?? undefined,
          name: dto.firstName,
        },
        context: {
          firstName: participant.firstName,
          bannerImageUrl: event.bannerImageUrl ?? undefined,
          startDate: event.startDate,
          endDate: event.endDate,
          selectedDays: saved.selectedDays,
          title: event.title,
          location: event.location,
          description: event.description ?? undefined,
          registrationId: participant.id,
          year: new Date().getFullYear(),
        },
      })
      .catch((error) => {
        this.logger.error(
          `Failed to send registration notification to ${email}: ${error.message}`,
        );
      });

    this.logger.log(`New participant registration for event "${event.title}": ${email}`);

    await Promise.all([
      this.invalidateParticipantCache(eventId),
      this.invalidateLookupCache(),
      this.invalidateEventCache(),
    ]);

    await this.activitiesService.logActivity({
      action: ActivityAction.REGISTER_EVENT,
      participantId: saved.id,
      details: `Registered for event ${event.title}`,
    });

    return saved;
  }

  async checkIn(eventId: string, participantId: string): Promise<Participant> {
    const participant = await this.participantRepository.findOne({
      where: { id: participantId, eventId },
    });

    if (!participant) {
      throw new NotFoundException('Participant registration not found for this event');
    }

    if (participant.hasAttended) {
      throw new BadRequestException('Participant has already checked in');
    }

    participant.hasAttended = true;
    participant.checkInTime = new Date();
    
    const updated = await this.participantRepository.save(participant);
    this.logger.log(`Participant checked in: ${participantId} for event ${eventId}`);

    await this.invalidateParticipantCache(eventId);
    
    await this.activitiesService.logActivity({
      action: ActivityAction.CHECK_IN_EVENT,
      participantId: updated.id,
      details: `Checked in for event ${eventId}`,
    });

    return updated;
  }

  async getParticipantsForEvent(
    eventId: string,
    query: ParticipantQueryDto,
  ): Promise<{ data: Participant[]; total: number }> {
    await this.eventsService.findOne(eventId);

    const cacheKey = `${PARTICIPANT_CACHE.LIST_PREFIX}${eventId}:${this.hashQuery(query as unknown as Record<string, unknown>)}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const qb = this.participantRepository
      .createQueryBuilder('p')
      .where('p.eventId = :eventId', { eventId });

    if (query.hasAttended !== undefined) {
      qb.andWhere('p.hasAttended = :hasAttended', { hasAttended: query.hasAttended });
    }

    if (query.search) {
      qb.andWhere(
        '(LOWER(p.firstName) LIKE LOWER(:search) OR LOWER(p.lastName) LIKE LOWER(:search) OR LOWER(p.email) LIKE LOWER(:search))',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy('p.createdAt', 'DESC')
      .skip(query.skip)
      .take(query.limit);

    const [data, total] = await qb.getManyAndCount();
    const result = { data, total };

    await this.redis.set(cacheKey, JSON.stringify(result), 'EX', PARTICIPANT_CACHE.TTL_SEC);

    return result;
  }

  async getRegistrationsByEmail(
    email: string,
    query: ParticipantQueryDto,
  ): Promise<{ data: Participant[]; total: number }> {
    const normalizedEmail = email.toLowerCase();
    const cacheKey = `${PARTICIPANT_CACHE.LOOKUP_PREFIX}${normalizedEmail}:${this.hashQuery(query as unknown as Record<string, unknown>)}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const qb = this.participantRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.event', 'event')
      .where('p.email = :email', { email: normalizedEmail });

    if (query.hasAttended !== undefined) {
      qb.andWhere('p.hasAttended = :hasAttended', { hasAttended: query.hasAttended });
    }

    qb.orderBy('p.createdAt', 'DESC')
      .skip(query.skip)
      .take(query.limit);

    const [data, total] = await qb.getManyAndCount();
    const result = { data, total };

    await this.redis.set(cacheKey, JSON.stringify(result), 'EX', PARTICIPANT_CACHE.TTL_SEC);

    return result;
  }

  async removeRegistration(eventId: string, participantId: string): Promise<void> {
    const participant = await this.participantRepository.findOne({
      where: { id: participantId, eventId },
    });

    if (!participant) {
      throw new NotFoundException('Participant registration not found');
    }

    await this.participantRepository.softRemove(participant);
    await this.eventsService.decrementRegistrationCount(eventId);
    this.logger.log(`Participant registration removed: ${participantId}`);

    await Promise.all([
      this.invalidateParticipantCache(eventId),
      this.invalidateLookupCache(),
      this.invalidateEventCache(),
    ]);
  }
}