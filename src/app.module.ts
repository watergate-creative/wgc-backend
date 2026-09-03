import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getMetadataArgsStorage } from 'typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from './auth/auth.module.js';
import { EventsModule } from './events/events.module.js';
import { ParticipantModule } from './participant/participant.module.js';
import { FileUploadModule } from './file-upload/file-upload.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { FormsModule } from './forms/forms.module.js';
import { SessionsModule } from './sessions/sessions.module.js';
import { ActivitiesModule } from './activities/activities.module.js';

import { MailModule } from './email/mail.module.js';
import { LoggerModule } from './logger/logger.module.js';

import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { RolesGuard } from './auth/guards/roles.guard.js';

import { GlobalExceptionFilter } from './common/filters/http-exception.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import { RedisModule } from './common/redis/redis.module.js';
import { YoutubeModule } from './youtube/youtube.module.js';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [

    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisModule,

    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.getOrThrow('REDIS_HOST'),
          port: configService.getOrThrow('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
    }),
    MailModule,

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST,
      port: Number(process.env.POSTGRES_PORT),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DATABASE,
      autoLoadEntities: true,
      entities: getMetadataArgsStorage().tables.map((tbl) => tbl.target),
      synchronize: true, // Temporarily true for active development
      ssl: true,
      extra: {
        ssl: {
          rejectUnauthorized: false,
        },
      },
    }),

    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 100,
        },
      ],
    }),

    LoggerModule,

    AuthModule,
    EventsModule,
    FileUploadModule,
    ParticipantModule,
    NotificationsModule,
    FormsModule,
    YoutubeModule,
    SessionsModule,
    ActivitiesModule
  ],
  controllers: [AppController],
  providers: [
    AppService,

    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },

    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },

    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },

    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },

    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },

    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}

