import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';
import { Event } from '../events/entities/event.entity.js';
import { FormEntry } from '../forms/entities/form-entry.entity.js';
import { YoutubeVideo } from '../youtube/entities/youtube-video.entity.js';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Event, FormEntry, YoutubeVideo]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
