import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventTypesService } from './event-types.service.js';
import { EventTypesController } from './event-types.controller.js';
import { EventType } from './entities/event-type.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([EventType])],
  controllers: [EventTypesController],
  providers: [EventTypesService],
  exports: [EventTypesService],
})
export class EventTypesModule {}
