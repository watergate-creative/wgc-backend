// infrastructure/redis/resilient-redis.service.ts
import { Injectable, Logger, Inject, OnModuleDestroy } from '@nestjs/common';
import Redis, { ChainableCommander, Pipeline } from 'ioredis';
import { REDIS_CLIENT } from '../../common/redis/redis.constants';

enum CircuitState {
  CLOSED = 'CLOSED',       // Normal operation: Redis is healthy
  OPEN = 'OPEN',           // Tripped: Fast-fail immediately to database fallback
  HALF_OPEN = 'HALF_OPEN', // Testing: Allowing one probe request to check recovery
}

@Injectable()
export class ResilientRedisService implements OnModuleDestroy {
  private readonly logger = new Logger(ResilientRedisService.name);
  
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastStateChange = Date.now();

  // Circuit Breaker Configuration
  private readonly FAILURE_THRESHOLD = 3;       // Trip after 3 consecutive failures
  private readonly COOLDOWN_PERIOD_MS = 30000;  // Stay OPEN for 30 seconds before retry
  private readonly OPERATION_TIMEOUT_MS = 1500; // Abort slow Redis calls after 1.5s

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Safely retrieves a key. Returns null if circuit is OPEN or Redis fails,
   * triggering an instant, silent fallback to PostgreSQL.
   */
  async get(key: string): Promise<string | null> {
    if (!this.canExecute()) return null;

    try {
      const result = await this.executeWithTimeout(this.redis.get(key));
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure('GET', key, error);
      return null;
    }
  }

  /**
   * Safely sets a key. Fails silently if Redis is unreachable.
   */
  async set(key: string, value: string, mode?: 'EX', ttlSeconds?: number): Promise<boolean> {
    if (!this.canExecute()) return false;

    try {
      const promise = mode && ttlSeconds 
        ? this.redis.set(key, value, mode, ttlSeconds)
        : this.redis.set(key, value);
        
      await this.executeWithTimeout(promise);
      this.onSuccess();
      return true;
    } catch (error) {
      this.onFailure('SET', key, error);
      return false;
    }
  }

  /**
   * Safely deletes a key.
   */
  async del(key: string): Promise<void> {
    if (!this.canExecute()) return;

    try {
      await this.executeWithTimeout(this.redis.del(key));
      this.onSuccess();
    } catch (error) {
      this.onFailure('DEL', key, error);
    }
  }

  /**
   * Safely deletes all keys matching a given prefix using SCAN (non-blocking).
   * Avoids the O(N) blocking KEYS command — safe for production workloads.
   */
  async deleteByPrefix(prefix: string): Promise<void> {
    if (!this.canExecute()) return;

    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.executeWithTimeout(
          this.redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100),
        );
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.executeWithTimeout(this.redis.del(...keys));
        }
      } while (cursor !== '0');
      this.onSuccess();
    } catch (error) {
      this.onFailure('SCAN_DEL', prefix, error);
    }
  }

  /**
   * Safely executes a batch pipeline. Returns false if Redis is down.
   */
  async execPipeline(callback: (pipeline: ChainableCommander) => void): Promise<boolean> {
    if (!this.canExecute()) return false;

    try {
      const pipeline = this.redis.pipeline();
      callback(pipeline);
      // pipeline.exec() returns a Promise<[error, result][]>
      await this.executeWithTimeout(pipeline.exec());
      this.onSuccess();
      return true;
    } catch (error) {
      this.onFailure('PIPELINE', 'batch', error);
      return false;
    }
  }

  private canExecute(): boolean {
    const now = Date.now();

    if (this.state === CircuitState.OPEN) {
      if (now - this.lastStateChange > this.COOLDOWN_PERIOD_MS) {
        this.transitionTo(CircuitState.HALF_OPEN);
        return true; // Allow probe request
      }
      return false; // Fast-fail without touching network
    }

    return true;
  }

  private onSuccess(): void {
    if (this.state !== CircuitState.CLOSED) {
      this.logger.log('Redis probe successful. Circuit Breaker RESET to CLOSED.');
      this.transitionTo(CircuitState.CLOSED);
    }
    this.failureCount = 0;
  }

  private onFailure(operation: string, key: string, error: any): void {
    this.failureCount++;
    
    if (this.state === CircuitState.HALF_OPEN || this.failureCount >= this.FAILURE_THRESHOLD) {
      if (this.state !== CircuitState.OPEN) {
        this.logger.error(
          `Redis threshold reached (${this.failureCount} failures). Tripping Circuit Breaker to OPEN. Traffic routed to DB. Last error during [${operation} ${key}]: ${error.message}`
        );
        this.transitionTo(CircuitState.OPEN);
      }
    } else {
      this.logger.warn(`Redis [${operation} ${key}] failed (${this.failureCount}/${this.FAILURE_THRESHOLD}): ${error.message}`);
    }
  }

  private transitionTo(newState: CircuitState): void {
    this.state = newState;
    this.lastStateChange = Date.now();
  }

  private async executeWithTimeout<T>(promise: Promise<T>): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Redis operation timed out')), this.OPERATION_TIMEOUT_MS);
    });

    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timer!);
    }
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }
}