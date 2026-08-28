import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionsController } from './sessions.controller.js';
import { SessionsService } from './sessions.service.js';
import { GoogleCalendarService } from './google-calendar.service.js';
import { MinisterProfile } from './entities/minister-profile.entity.js';
import { TimeBlock } from './entities/time-block.entity.js';
import { Session } from './entities/session.entity.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([MinisterProfile, TimeBlock, Session]),
    NotificationsModule,
  ],
  controllers: [SessionsController],
  providers: [SessionsService, GoogleCalendarService],
  exports: [SessionsService],
})
export class SessionsModule {}
