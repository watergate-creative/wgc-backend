// youtube.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { YoutubeVideo } from './entities/youtube-video.entity';
import { YoutubeApiClient } from './youtube-api.client';
import { YoutubeSyncProcessor } from './youtube-sync.processor';
import { YoutubeSyncCron } from './youtube-sync.cron';
import { YoutubeSearchService } from './youtube.service';
import { YoutubeController } from './youtube.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([YoutubeVideo]),
    HttpModule,
  ],
  controllers: [YoutubeController],
  providers: [
    YoutubeApiClient,
    YoutubeSyncProcessor,
    YoutubeSyncCron,
    YoutubeSearchService
  ],
  exports: [YoutubeSearchService],
})
export class YoutubeModule {}