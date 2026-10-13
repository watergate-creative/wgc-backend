import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResilientRedisService } from '../infrastructure/redis/resilient-redis-service.js';
import { DASHBOARD_CACHE } from '../common/redis/cache.constants.js';
import { Event } from '../events/entities/event.entity.js';
import { FormEntry } from '../forms/entities/form-entry.entity.js';
import { YoutubeVideo } from '../youtube/entities/youtube-video.entity.js';

@Injectable()
export class DashboardService implements OnModuleInit {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly redis: ResilientRedisService,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(FormEntry)
    private readonly formEntryRepository: Repository<FormEntry>,
    @InjectRepository(YoutubeVideo)
    private readonly videoRepository: Repository<YoutubeVideo>,
  ) {}

  async onModuleInit() {
    try {
      const rawStats = await this.redis.hgetall(DASHBOARD_CACHE.STATS_HASH);
      const eventsVal = rawStats?.['events'] !== undefined ? parseInt(rawStats['events'], 10) : NaN;
      const formsVal = rawStats?.['forms'] !== undefined ? parseInt(rawStats['forms'], 10) : NaN;
      const mediaVal = rawStats?.['media'] !== undefined ? parseInt(rawStats['media'], 10) : NaN;

      // If Redis has never been seeded or contains invalid/negative values, warm it from PostgreSQL
      if (!rawStats || isNaN(eventsVal) || eventsVal < 0 || isNaN(formsVal) || formsVal < 0 || isNaN(mediaVal) || mediaVal < 0) {
        this.logger.log('Seeding dashboard stats cache from database on startup...');
        await this.syncStats();
      } else {
        this.logger.log('Dashboard stats cache found and valid in Redis');
      }
    } catch (e) {
      this.logger.warn(`Could not warm dashboard stats cache on startup: ${e.message}`);
    }
  }

  /**
   * Cache-Aside Strategy:
   * 1. Check Redis cache first.
   * 2. If valid and non-negative, return directly from Redis (Cache Hit).
   * 3. If missing or invalid/negative, fall back to Database, populate Redis cache, and return (Cache Miss).
   */
  async getStats() {
    try {
      const rawStats = await this.redis.hgetall(DASHBOARD_CACHE.STATS_HASH);

      const hasEvents = rawStats?.['events'] !== undefined;
      const hasForms = rawStats?.['forms'] !== undefined;
      const hasMedia = rawStats?.['media'] !== undefined;

      const eventsVal = hasEvents ? parseInt(rawStats!['events'], 10) : NaN;
      const formsVal = hasForms ? parseInt(rawStats!['forms'], 10) : NaN;
      const mediaVal = hasMedia ? parseInt(rawStats!['media'], 10) : NaN;

      const isCacheValid =
        hasEvents &&
        hasForms &&
        hasMedia &&
        !isNaN(eventsVal) && eventsVal >= 0 &&
        !isNaN(formsVal) && formsVal >= 0 &&
        !isNaN(mediaVal) && mediaVal >= 0;

      if (isCacheValid) {
        // Cache Hit: served purely from Redis
        return {
          events: eventsVal,
          media: mediaVal,
          members: 0,
          testimonies: 0,
          forms: formsVal,
          pages: 0,
        };
      }

      // Cache Miss or Invalid/Negative data: fetch from DB and populate cache
      this.logger.warn(
        `Dashboard stats cache miss or invalid state detected (events: ${rawStats?.['events']}). Fetching from database...`,
      );
      return await this.syncStats();
    } catch (e) {
      this.logger.error(`Error in getStats: ${e.message}. Falling back to DB count.`);
      return await this.fetchCountsFromDatabase();
    }
  }

  /**
   * Authoritative count fetch from Database and Redis cache update.
   */
  async syncStats() {
    const counts = await this.fetchCountsFromDatabase();

    try {
      await Promise.all([
        this.redis.hset(DASHBOARD_CACHE.STATS_HASH, 'events', counts.events),
        this.redis.hset(DASHBOARD_CACHE.STATS_HASH, 'forms', counts.forms),
        this.redis.hset(DASHBOARD_CACHE.STATS_HASH, 'media', counts.media),
      ]);
      this.logger.log(`Dashboard stats cache updated: events=${counts.events}, forms=${counts.forms}, media=${counts.media}`);
    } catch (e) {
      this.logger.error(`Failed to write stats to Redis cache: ${e.message}`);
    }

    return counts;
  }

  private async fetchCountsFromDatabase() {
    const [eventsCount, formsCount, mediaCount] = await Promise.all([
      this.eventRepository.count(),
      this.formEntryRepository.count(),
      this.videoRepository.count(),
    ]);

    return {
      events: eventsCount,
      media: mediaCount,
      members: 0,
      testimonies: 0,
      forms: formsCount,
      pages: 0,
    };
  }

  async incrementStat(field: 'events' | 'media' | 'forms', count = 1) {
    try {
      await this.redis.hincrby(DASHBOARD_CACHE.STATS_HASH, field, count);
    } catch (e) {
      this.logger.error(`Failed to increment dashboard stat ${field}: ${e.message}`);
    }
  }

  async decrementStat(field: 'events' | 'media' | 'forms', count = 1) {
    try {
      const rawStats = await this.redis.hgetall(DASHBOARD_CACHE.STATS_HASH);
      if (!rawStats || rawStats[field] === undefined) {
        // If cache doesn't exist, sync from DB
        await this.syncStats();
        return;
      }

      const current = parseInt(rawStats[field] || '0', 10);
      const next = Math.max(0, current - count);
      await this.redis.hset(DASHBOARD_CACHE.STATS_HASH, field, next);
    } catch (e) {
      this.logger.error(`Failed to decrement dashboard stat ${field}: ${e.message}`);
    }
  }

  async setStat(field: 'events' | 'media' | 'forms', value: number) {
    try {
      const safeValue = Math.max(0, value);
      await this.redis.hset(DASHBOARD_CACHE.STATS_HASH, field, safeValue);
    } catch (e) {
      this.logger.error(`Failed to set dashboard stat ${field}: ${e.message}`);
    }
  }
}
