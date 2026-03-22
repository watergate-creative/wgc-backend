import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Event, EventStatus } from './entities/event.entity.js';
import { CreateEventDto, UpdateEventDto, EventQueryDto } from './dto/event.dto.js';
import { MinistersService } from '../ministers/ministers.service.js';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    private readonly ministersService: MinistersService,
  ) {}

  async create(dto: CreateEventDto): Promise<Event> {
    const slug = this.generateSlug(dto.title);

    const event = this.eventRepository.create({
      ...dto,
      slug,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
    });

    if (dto.ministerIds && dto.ministerIds.length > 0) {
      event.ministers = await this.ministersService.findByIds(dto.ministerIds);
    }

    const saved = await this.eventRepository.save(event);
    this.logger.log(`Event created: "${saved.title}" (${saved.slug})`);
    return saved;
  }

  async findAll(query: EventQueryDto): Promise<{ data: Event[]; total: number }> {
    const qb = this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.ministers', 'ministers')
      .loadRelationCountAndMap('event.participantCount', 'event.participants');

    this.applyFilters(qb, query);

    qb.orderBy('event.startDate', 'ASC')
      .skip(query.skip)
      .take(query.limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findUpcoming(limit = 10): Promise<Event[]> {
    return this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.ministers', 'ministers')
      .loadRelationCountAndMap('event.participantCount', 'event.participants')
      .where('event.status = :status', { status: EventStatus.PUBLISHED })
      .andWhere('event.isPublic = :isPublic', { isPublic: true })
      .andWhere('event.endDate >= :now', { now: new Date() })
      .orderBy('event.startDate', 'ASC')
      .take(limit)
      .getMany();
  }

  async findBySlug(slug: string): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { slug },
      relations: ['ministers', 'participants'],
    });
    if (!event) {
      throw new NotFoundException(`Event "${slug}" not found`);
    }
    return event;
  }

  async findOne(id: string): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: ['ministers', 'participants'],
    });
    if (!event) {
      throw new NotFoundException(`Event with ID "${id}" not found`);
    }
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

    if (dto.ministerIds !== undefined) {
      if (dto.ministerIds.length > 0) {
        event.ministers = await this.ministersService.findByIds(dto.ministerIds);
      } else {
        event.ministers = [];
      }
    }

    Object.assign(event, dto);
    const updated = await this.eventRepository.save(event);
    this.logger.log(`Event updated: "${updated.title}"`);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const event = await this.findOne(id);
    await this.eventRepository.softRemove(event);
    this.logger.log(`Event soft-deleted: ${id}`);
  }

  async incrementRegistrationCount(eventId: string): Promise<void> {
    await this.eventRepository.increment({ id: eventId }, 'registrationCount', 1);
  }

  async decrementRegistrationCount(eventId: string): Promise<void> {
    await this.eventRepository.decrement({ id: eventId }, 'registrationCount', 1);
  }

  private applyFilters(qb: SelectQueryBuilder<Event>, query: EventQueryDto): void {
    if (query.type) {
      qb.andWhere('event.type = :type', {
        type: query.type,
      });
    }

    if (query.status) {
      qb.andWhere('event.status = :status', { status: query.status });
    }

    if (query.search) {
      qb.andWhere(
        '(LOWER(event.title) LIKE LOWER(:search) OR LOWER(event.description) LIKE LOWER(:search))',
        { search: `%${query.search}%` },
      );
    }

    if (query.fromDate) {
      qb.andWhere('event.startDate >= :fromDate', {
        fromDate: new Date(query.fromDate),
      });
    }

    if (query.toDate) {
      qb.andWhere('event.endDate <= :toDate', {
        toDate: new Date(query.toDate),
      });
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
