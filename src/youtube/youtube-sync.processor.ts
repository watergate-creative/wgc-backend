
import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { YoutubeVideo } from './entities/youtube-video.entity';
import { YoutubeApiClient, PlaylistSummary } from './youtube-api.client';
import { YOUTUBE_CACHE } from './youtube.constants';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../common/redis/redis.constants';

@Injectable()
export class YoutubeSyncProcessor {
  private readonly logger = new Logger(YoutubeSyncProcessor.name);
  private readonly BATCH_SIZE = 100;

  constructor(
    @InjectRepository(YoutubeVideo)
    private readonly videoRepository: Repository<YoutubeVideo>,
    private readonly apiClient: YoutubeApiClient,
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
  ) {}

  async processPipeline(channelId: string): Promise<void> {
    this.logger.log(`Starting category-classified pipeline sync for channel: ${channelId}`);
    const rawSearchItems = await this.apiClient.fetchAllChannelVideos(channelId);
    if (rawSearchItems.length === 0) {
      this.logger.warn('No videos returned from API.');
      return;
    }
    const videoIds = rawSearchItems.map(item => item.id.videoId);
    const rawDetailsItems = await this.apiClient.fetchVideoDetails(videoIds);
    const durationMap = new Map<string, string>(
      rawDetailsItems.map(item => [item.id, item.contentDetails?.duration || 'PT0S'])
    );
    const categoryMap = await this.buildVideoCategoryMap(channelId);
    const domainEntities = this.transformToEntities(rawSearchItems, durationMap, categoryMap);
    await this.executeBatchUpsert(domainEntities);
    await this.refreshCache();
    this.logger.log('Nightly pipeline sync completed successfully.');
  }

  
  private async buildVideoCategoryMap(channelId: string): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    
    try {
      const playlists: PlaylistSummary[] = await this.apiClient.fetchChannelPlaylists(channelId);
      this.logger.debug(`Fetched ${playlists.length} playlists for classification.`);

      for (const playlist of playlists) {
        const itemIds = await this.apiClient.fetchPlaylistItems(playlist.playlistId);
        for (const videoId of itemIds) {
          const existingCategories = map.get(videoId) || [];
          if (!existingCategories.includes(playlist.title)) {
            existingCategories.push(playlist.title);
          }
          map.set(videoId, existingCategories);
        }
      }
    } catch (error) {
      this.logger.error('Failed to build category map from playlists. Using fallback "General" category.', error);
    }

    return map;
  }

  private transformToEntities(
    searchItems: any[], 
    durationMap: Map<string, string>,
    categoryMap: Map<string, string[]>
  ): Partial<YoutubeVideo>[] {
    const entityMap = new Map<string, Partial<YoutubeVideo>>();
    const now = new Date();

    for (const item of searchItems) {
      const vId = item.id?.videoId;
      if (!vId) continue; 

      const assignedCategories = categoryMap.get(vId);
      entityMap.set(vId, {
        videoId: vId,
        title: item.snippet?.title || 'Untitled Video',
        description: item.snippet?.description || '',
        publishedAt: new Date(item.snippet?.publishedAt || now),
        duration: durationMap.get(vId) || 'PT0S',
        videoUrl: `https://www.youtube.com/watch?v=${vId}`,
        embedUrl: `https://www.youtube.com/embed/${vId}`,
        category: assignedCategories && assignedCategories.length > 0 ? assignedCategories : ['General'],
        updatedAt: now,
      });
    }

    const deduplicatedEntities = Array.from(entityMap.values());
    this.logger.debug(`Transformed ${searchItems.length} raw items into ${deduplicatedEntities.length} unique domain entities.`);
    
    return deduplicatedEntities;
  }

  
  private async executeBatchUpsert(entities: Partial<YoutubeVideo>[]): Promise<void> {
    if (entities.length === 0) {
      this.logger.warn('No entities to upsert after deduplication.');
      return;
    }

    let totalProcessed = 0;

    for (let i = 0; i < entities.length; i += this.BATCH_SIZE) {
      const batch = entities.slice(i, i + this.BATCH_SIZE);

      await this.videoRepository.createQueryBuilder()
        .insert()
        .into(YoutubeVideo)
        .values(batch)
        .orUpdate(
          ['title', 'description', 'duration', 'videoUrl', 'embedUrl', 'category', 'updatedAt'], 
          ['videoId'], 
          { skipUpdateIfNoValuesChanged: true }
        )
        .execute();

      totalProcessed += batch.length;
      this.logger.debug(`Upserted batch ${Math.floor(i / this.BATCH_SIZE) + 1}. Total records processed: ${totalProcessed}`);
    }

    this.logger.log(`Batch upsert completed successfully for ${totalProcessed} unique video records.`);
  }

  private async refreshCache(): Promise<void> {
    const [pool, totalRecords] = await this.videoRepository.findAndCount({
      order: { publishedAt: 'DESC' },
      take: 100,
    });

    const cachePayload = { pool, totalRecords };
    const pipeline = this.redisClient.pipeline();
    pipeline.set(
      YOUTUBE_CACHE.LATEST_VIDEOS_KEY, 
      JSON.stringify(cachePayload), 
      'EX', 
      YOUTUBE_CACHE.LATEST_TTL_SEC
    );

    await pipeline.exec();
    
    this.logger.log(`Redis cache warmed successfully with ${totalRecords} records.`);
  }
}