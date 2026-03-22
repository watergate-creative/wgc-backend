import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Participant } from './entities/participant.entity.js';
import { ParticipantService } from './participant.service.js';
import { ParticipantController } from './participant.controller.js';
import { EventsModule } from '../events/events.module.js';
import { EmailModule } from '../email/email.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Participant]),
    forwardRef(() => EventsModule),
    EmailModule,
    NotificationsModule,
  ],
  controllers: [ParticipantController],
  providers: [ParticipantService],
  exports: [ParticipantService],
})
export class ParticipantModule {}

