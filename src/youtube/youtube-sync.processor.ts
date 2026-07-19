// application/youtube-sync.processor.ts
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
    
    // 1. Fetch all videos from channel
    const rawSearchItems = await this.apiClient.fetchAllChannelVideos(channelId);
    if (rawSearchItems.length === 0) {
      this.logger.warn('No videos returned from API.');
      return;
    }

    // 2. Fetch duration details in chunks
    const videoIds = rawSearchItems.map(item => item.id.videoId);
    const rawDetailsItems = await this.apiClient.fetchVideoDetails(videoIds);
    const durationMap = new Map<string, string>(
      rawDetailsItems.map(item => [item.id, item.contentDetails?.duration || 'PT0S'])
    );

    // 3. Principal Optimization: Build inverted Category Map (videoId -> playlistNames[])
    const categoryMap = await this.buildVideoCategoryMap(channelId);

    // 4. Transform to domain entities with category classification
    const domainEntities = this.transformToEntities(rawSearchItems, durationMap, categoryMap);
    
    // 5. Batch upsert with category updating
    await this.executeBatchUpsert(domainEntities);
    
    // 6. Refresh Redis search indexes and category pools
    await this.refreshCache();
    this.logger.log('Nightly pipeline sync completed successfully.');
  }

  /**
   * Builds an in-memory lookup map linking videoIds to their parent playlist titles.
   * Pre-fetching this prevents N+1 HTTP calls during entity transformation.
   */
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
      // Defensive check: ignore non-video resources (e.g., channels/playlists) returned in search results
      if (!vId) continue; 

      const assignedCategories = categoryMap.get(vId);

      // By using entityMap.set(vId, ...), if YouTube returns the exact same videoId on page 1 and page 3,
      // our in-memory map simply overwrites the entry instead of creating a duplicate array item.
      entityMap.set(vId, {
        videoId: vId,
        title: item.snippet?.title || 'Untitled Video',
        description: item.snippet?.description || '',
        publishedAt: new Date(item.snippet?.publishedAt || now),
        duration: durationMap.get(vId) || 'PT0S',
        videoUrl: `https://www.youtube.com/watch?v=${vId}`,
        embedUrl: `https://www.youtube.com/embed/${vId}`,
        category: assignedCategories && assignedCategories.length > 0 ? assignedCategories : ['General'],
        // Explicitly pass updatedAt so your BaseEntity tracks modifications during QueryBuilder upserts
        updatedAt: now,
      });
    }

    const deduplicatedEntities = Array.from(entityMap.values());
    this.logger.debug(`Transformed ${searchItems.length} raw items into ${deduplicatedEntities.length} unique domain entities.`);
    
    return deduplicatedEntities;
  }

  /**
   * Executes batch upserts into PostgreSQL targeting the unique constraint on `videoId`.
   */
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
          // 1. Columns to update if the videoId already exists in the database.
          // We include 'updatedAt' so your BaseEntity timestamp stays current!
          ['title', 'description', 'duration', 'videoUrl', 'embedUrl', 'category', 'updatedAt'], 
          
          // 2. Conflict Target: We target the unique index on 'videoId', NOT the UUID 'id'
          ['videoId'], 
          
          // 3. Performance optimization: skip DB write if YouTube metadata hasn't changed
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

    // 1. Cache the general paginated pool
    pipeline.set(
      YOUTUBE_CACHE.LATEST_VIDEOS_KEY, 
      JSON.stringify(cachePayload), 
      'EX', 
      YOUTUBE_CACHE.LATEST_TTL_SEC
    );

    // 2. Cache a lightweight search index in Redis for instant search/category filtering
    const allVideos = await this.videoRepository.find({ order: { publishedAt: 'DESC' } });
    const searchIndex = allVideos.map(v => ({
      videoId: v.videoId,
      title: v.title.toLowerCase(),
      description: (v.description || '').toLowerCase(),
      category: v.category || ['General'],
      publishedAt: v.publishedAt,
      duration: v.duration,
      videoUrl: v.videoUrl,
      embedUrl: v.embedUrl
    }));

    pipeline.set(YOUTUBE_CACHE.SEARCH_INDEX_KEY, JSON.stringify(searchIndex), 'EX', YOUTUBE_CACHE.LATEST_TTL_SEC);
    await pipeline.exec();
    
    this.logger.log(`Redis cache warmed successfully with ${totalRecords} records and search index.`);
  }
}