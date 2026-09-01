import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, LessThan, In } from 'typeorm';
import { Event, EventStatus } from './entities/event.entity.js';
import { CreateEventDto, UpdateEventDto, EventQueryDto } from './dto/event.dto.js';
import { ResilientRedisService } from '../infrastructure/redis/resilient-redis-service.js';
import { EVENT_CACHE } from '../common/redis/cache.constants.js';
import { createHash } from 'crypto';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    private readonly redis: ResilientRedisService,
  ) { }

  // ─── CACHE HELPERS ────────────────────────────────────────────

  /**
   * Produces a short, deterministic hash from query parameters
   * to use as a cache key suffix. Sorted keys ensure identical
   * queries always map to the same cache entry.
   */
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

  /** Invalidate every cached key under the events namespace. */
  private async invalidateEventCache(): Promise<void> {
    await this.redis.deleteByPrefix(EVENT_CACHE.NAMESPACE);
  }

  // ─── QUERIES ──────────────────────────────────────────────────

  async create(dto: CreateEventDto): Promise<Event> {
    const slug = this.generateSlug(dto.title);

    const event = this.eventRepository.create({
      ...dto,
      slug,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      dailySchedule: dto.dailySchedule ? JSON.stringify(dto.dailySchedule) : "",
    });


    const saved = await this.eventRepository.save(event);
    this.logger.log(`Event created: "${saved.title}" (${saved.slug})`);

    await this.invalidateEventCache();

    return saved;
  }

  async findAll(query: EventQueryDto): Promise<{ data: Event[]; total: number }> {
    const cacheKey = `${EVENT_CACHE.LIST_PREFIX}${this.hashQuery(query as unknown as Record<string, unknown>)}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const qb = this.eventRepository
      .createQueryBuilder('event')
      .loadRelationIdAndMap('event.participantCount', 'event.participants');

    this.applyFilters(qb, query);

    qb.orderBy('event.startDate', 'ASC')
      .skip(query.skip)
      .take(query.limit);

    const [data, total] = await qb.getManyAndCount();
    const result = { data, total };

    await this.redis.set(cacheKey, JSON.stringify(result), 'EX', EVENT_CACHE.TTL_SEC);

    return result;
  }

  async findUpcoming(limit = 10): Promise<Event[]> {
    const cacheKey = `${EVENT_CACHE.UPCOMING_PREFIX}${limit}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const query = this.eventRepository.createQueryBuilder('event');

    const data = await query
      // Ensure this is called directly on the instance
      .loadRelationIdAndMap('event.participantCount', 'event.participants')
      .where('event.status = :status', { status: EventStatus.PUBLISHED })
      .andWhere('event.endDate >= :now', { now: new Date() })
      .orderBy('event.startDate', 'ASC')
      .take(limit)
      .getMany();

    await this.redis.set(cacheKey, JSON.stringify(data), 'EX', EVENT_CACHE.TTL_SEC);

    return data;
  }

  async findBySlug(slug: string): Promise<Event> {
    const cacheKey = `${EVENT_CACHE.SLUG_PREFIX}${slug}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const event = await this.eventRepository.findOne({
      where: { slug },
      relations: { 'participants': true },
    });
    if (!event) {
      throw new NotFoundException(`Event "${slug}" not found`);
    }

    await this.redis.set(cacheKey, JSON.stringify(event), 'EX', EVENT_CACHE.TTL_SEC);

    return event;
  }

  async findOne(id: string): Promise<Event> {
    const cacheKey = `${EVENT_CACHE.DETAIL_PREFIX}${id}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const event = await this.eventRepository.findOne({
      where: { id },
      relations: { 'participants': true },
    });
    if (!event) {
      throw new NotFoundException(`Event with ID "${id}" not found`);
    }

    await this.redis.set(cacheKey, JSON.stringify(event), 'EX', EVENT_CACHE.TTL_SEC);

    return event;
  }

  async update(id: string, dto: UpdateEventDto): Promise<Event> {
    const event = await this.findOne(id);

    if (dto.title && dto.title !== event.title) {
      (dto as any).slug = this.generateSlug(dto.title);
    }

    if (dto.startDate) {
      (dto as any).startDate = new Date(dto.startDate);
    }
    if (dto.endDate) {
      (dto as any).endDate = new Date(dto.endDate);
    }


    if (dto.dailySchedule !== undefined) {
      (dto as any).dailySchedule = JSON.stringify(dto.dailySchedule);
    }

    Object.assign(event, dto);
    const updated = await this.eventRepository.save(event);
    this.logger.log(`Event updated: "${updated.title}"`);

    await this.invalidateEventCache();

    return updated;
  }

  async remove(id: string): Promise<void> {
    const event = await this.findOne(id);
    await this.eventRepository.softRemove(event);
    this.logger.log(`Event soft-deleted: ${id}`);

    await this.invalidateEventCache();
  }

  async incrementRegistrationCount(eventId: string): Promise<void> {
    await this.eventRepository.increment({ id: eventId }, 'registrationCount', 1);
    await this.invalidateEventCache();
  }

  async decrementRegistrationCount(eventId: string): Promise<void> {
    await this.eventRepository.decrement({ id: eventId }, 'registrationCount', 1);
    await this.invalidateEventCache();
  }

  // ─── EVENT LIFECYCLE TRANSITIONS ───────────────────────────────

  /**
   * Transitions published events whose startDate has arrived to ongoing.
   * Called by the EventLifecycleCronService every minute.
   */
  async markOngoingEvents(): Promise<number> {
    const now = new Date();

    const result = await this.eventRepository
      .createQueryBuilder()
      .update(Event)
      .set({ status: EventStatus.ONGOING })
      .where('status = :status', { status: EventStatus.PUBLISHED })
      .andWhere('"startDate" <= :now', { now })
      .andWhere('"endDate" >= :now', { now })
      .execute();

    const affected = result.affected ?? 0;

    if (affected > 0) {
      this.logger.log(`Transitioned ${affected} event(s) to ongoing`);
      await this.invalidateEventCache();
    }

    return affected;
  }

  /**
   * Marks all ongoing or published events whose endDate has elapsed as completed.
   * Called by the EventLifecycleCronService every minute.
   */
  async markExpiredEventsAsCompleted(): Promise<number> {
    const result = await this.eventRepository.update(
      {
        status: In([EventStatus.PUBLISHED, EventStatus.ONGOING]),
        endDate: LessThan(new Date()),
      },
      { status: EventStatus.COMPLETED },
    );

    const affected = result.affected ?? 0;

    if (affected > 0) {
      this.logger.log(`Auto-completed ${affected} expired event(s)`);
      await this.invalidateEventCache();
    }

    return affected;
  }

  // ─── PRIVATE HELPERS ──────────────────────────────────────────

  private applyFilters(qb: SelectQueryBuilder<Event>, query: EventQueryDto): void {

    const { type, status, search, fromDate, toDate } = query;
    const effectiveFromDate = fromDate ?? new Date().toISOString().slice(0, 10);

    qb.andWhere('DATE(event.endDate) >= DATE(:effectiveFromDate)', { effectiveFromDate });

    if (toDate) {
      qb.andWhere('DATE(event.startDate) <= DATE(:effectiveEndDate)', {
        effectiveEndDate: toDate,
      });
    }

    if (type) {
      qb.andWhere('event.type = :type', { type });
    }

    if (status) {
      qb.andWhere('event.status = :status', { status });
    }

    if (search) {
      qb.andWhere(
        '(event.title ILIKE :search OR event.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }
  }

  private generateSlug(title: string): string {
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const uniqueSuffix = Date.now().toString(36);
    return `${baseSlug}-${uniqueSuffix}`;
  }
}
