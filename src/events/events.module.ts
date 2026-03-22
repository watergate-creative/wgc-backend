import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './entities/event.entity.js';
import { EventsService } from './events.service.js';
import { EventsController } from './events.controller.js';
import { MinistersModule } from '../ministers/ministers.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Event]), MinistersModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
