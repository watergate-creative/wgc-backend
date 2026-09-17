import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventType } from './entities/event-type.entity.js';
import { CreateEventTypeDto, UpdateEventTypeDto } from './dto/event-type.dto.js';
import { ResilientRedisService } from '../infrastructure/redis/resilient-redis-service.js';

@Injectable()
export class EventTypesService {
  private readonly logger = new Logger(EventTypesService.name);
  private readonly CACHE_KEY = 'event-types:list';

  constructor(
    @InjectRepository(EventType)
    private readonly eventTypeRepository: Repository<EventType>,
    private readonly redis: ResilientRedisService,
  ) {}

  async create(createEventTypeDto: CreateEventTypeDto): Promise<EventType> {
    const existing = await this.eventTypeRepository.findOne({
      where: [{ name: createEventTypeDto.name }, { slug: createEventTypeDto.slug }],
    });

    if (existing) {
      throw new ConflictException('Event type with this name or slug already exists');
    }

    const eventType = this.eventTypeRepository.create(createEventTypeDto);
    await this.eventTypeRepository.save(eventType);
    
    await this.invalidateCache();
    return eventType;
  }

  async findAll(activeOnly = false): Promise<EventType[]> {
    const cacheKey = activeOnly ? `${this.CACHE_KEY}:active` : `${this.CACHE_KEY}:all`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const whereClause = activeOnly ? { isActive: true } : {};
    const eventTypes = await this.eventTypeRepository.find({
      where: whereClause,
      order: { name: 'ASC' },
    });

    await this.redis.set(cacheKey, JSON.stringify(eventTypes), 'EX', 86400); // Cache for 24h
    return eventTypes;
  }

  async findOne(id: string): Promise<EventType> {
    const eventType = await this.eventTypeRepository.findOne({ where: { id } });
    if (!eventType) {
      throw new NotFoundException(`Event type with ID ${id} not found`);
    }
    return eventType;
  }

  async findBySlug(slug: string): Promise<EventType> {
    const eventType = await this.eventTypeRepository.findOne({ where: { slug } });
    if (!eventType) {
      throw new NotFoundException(`Event type with slug ${slug} not found`);
    }
    return eventType;
  }

  async update(id: string, updateEventTypeDto: UpdateEventTypeDto): Promise<EventType> {
    const eventType = await this.findOne(id);
    
    // Check for conflicts if slug or name is being updated
    if (updateEventTypeDto.name || updateEventTypeDto.slug) {
      const qb = this.eventTypeRepository.createQueryBuilder('et')
        .where('et.id != :id', { id });
        
      const conditions: string[] = [];
      if (updateEventTypeDto.name) conditions.push('et.name = :name');
      if (updateEventTypeDto.slug) conditions.push('et.slug = :slug');
      
      const existing = await qb.andWhere(`(${conditions.join(' OR ')})`, updateEventTypeDto).getOne();
      
      if (existing) {
        throw new ConflictException('Event type with this name or slug already exists');
      }
    }

    Object.assign(eventType, updateEventTypeDto);
    await this.eventTypeRepository.save(eventType);
    
    await this.invalidateCache();
    return eventType;
  }

  async remove(id: string): Promise<void> {
    const eventType = await this.findOne(id);
    // Note: If events are linked, this might throw a FK constraint error.
    // Setting isActive to false is generally safer, but we provide delete here for completion.
    try {
      await this.eventTypeRepository.remove(eventType);
      await this.invalidateCache();
    } catch (error) {
      this.logger.error(`Failed to delete event type: ${error.message}`);
      throw new ConflictException('Cannot delete event type that has associated events. Consider setting isActive to false instead.');
    }
  }

  private async invalidateCache(): Promise<void> {
    await this.redis.del(`${this.CACHE_KEY}:all`);
    await this.redis.del(`${this.CACHE_KEY}:active`);
  }
}
