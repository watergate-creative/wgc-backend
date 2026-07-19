// application/youtube.controller.ts
import { Controller, Get, Post, Query, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { YoutubeSyncProcessor } from './youtube-sync.processor';
import { YoutubeSearchQueryDto, PaginatedResult } from './dto/youtube.dto';
import { YoutubeVideo } from './entities/youtube-video.entity';
import { YoutubeSearchService } from './youtube.service';
import { Public } from '../common';

@ApiTags('YouTube Media')
@Controller('youtube')
export class YoutubeController {
  private readonly logger = new Logger(YoutubeController.name);

  constructor(
    private readonly searchService: YoutubeSearchService,
    private readonly syncProcessor: YoutubeSyncProcessor,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Get('videos')
  @ApiOperation({ 
    summary: 'Retrieve paginated YouTube videos',
    description: 'Fetches videos from the cache or database. Supports text search and category filtering.' 
  })
  @ApiResponse({ status: 200, description: 'Successfully retrieved paginated videos.' })
  async getVideos(
    @Query() queryDto: YoutubeSearchQueryDto,
  ): Promise<PaginatedResult<YoutubeVideo>> {
    return this.searchService.querySearch(queryDto);
  }

  @Public()
  @Post('sync/trigger')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ 
    summary: 'Manually trigger YouTube pipeline sync',
    description: 'Runs the ingestion pipeline in the background. Useful for administrative forced-refreshes.' 
  })
  @ApiResponse({ status: 202, description: 'Pipeline sync triggered successfully.' })
  async triggerManualSync(): Promise<{ message: string }> {
    const channelId = this.configService.getOrThrow<string>('YOUTUBE_CHANNEL_ID');
    
    // Execute asynchronously so the HTTP request doesn't hang until ingestion completes
    this.syncProcessor.processPipeline(channelId).catch((err) => {
      this.logger.error('Manual pipeline sync failed during background execution', err.stack);
    });

    return { message: 'YouTube ingestion pipeline started in the background.' };
  }
}