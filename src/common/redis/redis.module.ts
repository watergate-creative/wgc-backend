import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REDIS_CLIENT } from './redis.constants';
import Redis from 'ioredis';
import { ResilientRedisService } from '../../infrastructure/redis/resilient-redis-service';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.getOrThrow<string>('REDIS_HOST');
        const port = configService.getOrThrow<number>('REDIS_PORT');
        const password = configService.get<string>('REDIS_PASSWORD'); 

        return new Redis({
          host,
          port,
          password,
          maxRetriesPerRequest: 1, 
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
        });
      },
    },
    ResilientRedisService, 
  ],
  exports: [REDIS_CLIENT, ResilientRedisService], 
})
export class RedisModule {}