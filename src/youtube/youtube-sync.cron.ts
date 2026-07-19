// application/youtube-sync.cron.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { YoutubeSyncProcessor } from './youtube-sync.processor';

@Injectable()
export class YoutubeSyncCron {
  private readonly logger = new Logger(YoutubeSyncCron.name);

  constructor(
    private readonly processor: YoutubeSyncProcessor,
    private readonly configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_6_HOURS)
  async runNightlySync() {
    this.logger.log('Nightly Cron Trigger Fired.');
    const channelId = this.configService.getOrThrow<string>('YOUTUBE_CHANNEL_ID');
    
    try {
      await this.processor.processPipeline(channelId);
    } catch (err) {
      if (err instanceof Error) {
        this.logger.error(
          'Critical runtime crash intercepted during sync loop processing', 
          err.stack,
        );
      } else {
        this.logger.error(
          'Unknown error intercepted during sync loop processing', 
          String(err),
        );
      }
    }
  }
}
