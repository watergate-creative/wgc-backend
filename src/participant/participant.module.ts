import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Participant } from './entities/participant.entity.js';
import { ParticipantService } from './participant.service.js';
import { ParticipantController } from './participant.controller.js';
import { EventsModule } from '../events/events.module.js';
import { MailModule } from '../email/mail.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Participant]),
    forwardRef(() => EventsModule),
    MailModule,
    NotificationsModule,
  ],
  controllers: [ParticipantController],
  providers: [ParticipantService],
  exports: [ParticipantService],
})
export class ParticipantModule {}

