import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ResilientRedisService } from '../infrastructure/redis/resilient-redis-service.js';
import { DASHBOARD_CACHE } from '../common/redis/cache.constants.js';

@Injectable()
export class DashboardService implements OnModuleInit {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly redis: ResilientRedisService) {}

  async onModuleInit() {
    // We can initialize values to 0 if they don't exist yet to prevent nulls.
    // However, hincrby handles missing fields by initializing them to 0 automatically.
    this.logger.log('DashboardService initialized');
  }

  async getStats() {
    const rawStats = await this.redis.hgetall(DASHBOARD_CACHE.STATS_HASH) || {};
    
    // Parse strings to numbers, defaulting to 0 for tracking items
    return {
      events: parseInt(rawStats['events'] || '0', 10),
      media: parseInt(rawStats['media'] || '0', 10),
      members: 0, // Explicitly ignored per user request
      testimonies: 0, // Handled under forms, returning 0 for explicit UI stat
      forms: parseInt(rawStats['forms'] || '0', 10),
      pages: 0, // Handled under forms, returning 0 for explicit UI stat
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
      await this.redis.hincrby(DASHBOARD_CACHE.STATS_HASH, field, -count);
    } catch (e) {
      this.logger.error(`Failed to decrement dashboard stat ${field}: ${e.message}`);
    }
  }

  async setStat(field: 'events' | 'media' | 'forms', value: number) {
    try {
      await this.redis.hset(DASHBOARD_CACHE.STATS_HASH, field, value);
    } catch (e) {
      this.logger.error(`Failed to set dashboard stat ${field}: ${e.message}`);
    }
  }
}
