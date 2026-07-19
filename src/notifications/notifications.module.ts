import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../events/entities/event.entity.js';
import { Participant } from '../participant/entities/participant.entity.js';
import { MailModule } from '../email/mail.module.js';
import { CountdownCronService } from './countdown.cron.js';
import { TermiiService } from './termii.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, Participant]),
    MailModule,
  ],
  providers: [CountdownCronService, TermiiService],
  exports: [TermiiService],
})
export class NotificationsModule {}
