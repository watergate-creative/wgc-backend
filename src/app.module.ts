import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getMetadataArgsStorage } from 'typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

// Feature modules
import { AuthModule } from './auth/auth.module.js';
import { EventsModule } from './events/events.module.js';
import { MinistersModule } from './ministers/ministers.module.js';
import { ParticipantModule } from './participant/participant.module.js';
import { FileUploadModule } from './file-upload/file-upload.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { FormsModule } from './forms/forms.module.js';

// Global modules
import { EmailModule } from './email/email.module.js';
import { LoggerModule } from './logger/logger.module.js';

// Guards
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { RolesGuard } from './auth/guards/roles.guard.js';

// Filters & Interceptors
import { GlobalExceptionFilter } from './common/filters/http-exception.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Cron Jobs Scheduling
    ScheduleModule.forRoot(),

    // Database
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
      // ssl: true,
      // extra: {
      //   ssl: {
      //     rejectUnauthorized: false,
      //   },
      // },
    }),

    // Rate Limiting — 100 requests per minute globally
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 100,
        },
      ],
    }),

    // Global modules
    LoggerModule,
    EmailModule,

    // Feature modules
    AuthModule,
    MinistersModule,
    EventsModule,
    FileUploadModule,
    ParticipantModule,
    NotificationsModule,
    FormsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    // Global JWT Auth Guard (respects @Public() decorator)
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },

    // Global Roles Guard
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },

    // Global Rate Limiting Guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },

    // Global Exception Filter
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },

    // Global Response Transform Interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },

    // Global Logging Interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
