// application/youtube-search.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { YoutubeVideo } from './entities/youtube-video.entity';
import { YOUTUBE_CACHE } from './youtube.constants';
import { PaginatedResult, YoutubeSearchQueryDto } from './dto/youtube.dto';
import { ResilientRedisService } from '../infrastructure/redis/resilient-redis-service';

@Injectable()
export class YoutubeSearchService {
  private readonly logger = new Logger(YoutubeSearchService.name);

  constructor(
    @InjectRepository(YoutubeVideo)
    private readonly videoRepository: Repository<YoutubeVideo>,
    private readonly resilientRedis: ResilientRedisService,
  ) {}

  async querySearch(rawQuery: YoutubeSearchQueryDto): Promise<PaginatedResult<YoutubeVideo>> {
    const sanitized = rawQuery?.search?.trim()?.toLowerCase() || '';
    const categoryFilter = rawQuery?.category?.trim() || '';
    const limit = Number(rawQuery?.limit) || 10;
    const skip = Number(rawQuery?.skip) || 0;
    const currentPage = Math.floor(skip / limit) + 1;

    if (!sanitized && !categoryFilter) {
      return this.getCachedLatest(skip, limit, currentPage);
    }

    const cacheKey = `${YOUTUBE_CACHE.SEARCH_PREFIX}${sanitized}:cat_${categoryFilter.toLowerCase()}:${skip}:${limit}`;
    
    // 1. Safe Redis lookup (returns null instantly if circuit is OPEN)
    const cachedResult = await this.resilientRedis.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }

    // 2. Check high-speed in-memory Redis search index
    const redisIndex = await this.resilientRedis.get(YOUTUBE_CACHE.SEARCH_INDEX_KEY);
    if (redisIndex) {
      const index: any[] = JSON.parse(redisIndex);
      const filtered = index.filter(item => {
        const matchesText = !sanitized || 
          item.title.includes(sanitized) || 
          item.description.includes(sanitized);
          
        const matchesCategory = !categoryFilter || 
          item.category.some((c: string) => c.toLowerCase() === categoryFilter.toLowerCase());

        return matchesText && matchesCategory;
      });

      const paginatedData = filtered.slice(skip, skip + limit);
      const response: PaginatedResult<YoutubeVideo> = {
        data: paginatedData,
        currentPage,
        pageSize: limit,
        totalRecords: filtered.length,
        totalPages: Math.ceil(filtered.length / limit) || 1,
      };

      await this.resilientRedis.set(cacheKey, JSON.stringify(response), 'EX', YOUTUBE_CACHE.SEARCH_TTL_SEC);
      return response;
    }

    // 3. High-Performance PostgreSQL GIN Index Fallback Query
    this.logger.debug('Executing PostgreSQL GIN-optimized fallback query.');
    
    const qb = this.videoRepository.createQueryBuilder('video');

    if (categoryFilter) {
      // ⚡ The @> operator uses the GIN index to verify array containment in O(1) time
      qb.andWhere('video.category @> :categoryFilter::jsonb', {
        categoryFilter: JSON.stringify([categoryFilter]),
      });
    }

    if (sanitized) {
      qb.andWhere(new Brackets(qb => {
        qb.where('video.title ILIKE :search', { search: `%${sanitized}%` })
          .orWhere('video.description ILIKE :search', { search: `%${sanitized}%` });
      }));
    }

    const [records, totalRecords] = await qb
      .orderBy('video.publishedAt', 'DESC')
      .take(limit)
      .skip(skip)
      .getManyAndCount();

    const response: PaginatedResult<YoutubeVideo> = {
      data: records,
      currentPage,
      pageSize: limit,
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit) || 1,
    };

    await this.resilientRedis.set(cacheKey, JSON.stringify(response), 'EX', YOUTUBE_CACHE.SEARCH_TTL_SEC);
    return response;
  }

  private async getCachedLatest(skip: number, limit: number, currentPage: number): Promise<PaginatedResult<YoutubeVideo>> {
    const cache = await this.resilientRedis.get(YOUTUBE_CACHE.LATEST_VIDEOS_KEY);
    
    if (cache) {
      const parsed = JSON.parse(cache);
      if (Array.isArray(parsed) || !Array.isArray(parsed?.pool)) {
        await this.resilientRedis.del(YOUTUBE_CACHE.LATEST_VIDEOS_KEY);
      } else {
        const { pool, totalRecords } = parsed;
        return {
          data: pool.slice(skip, skip + limit),
          currentPage,
          pageSize: limit,
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit) || 1,
        };
      }
    }

    const [pool, totalRecords] = await this.videoRepository.findAndCount({
      order: { publishedAt: 'DESC' },
      take: 100,
    });

    const cachePayload = { pool, totalRecords };
    await this.resilientRedis.set(
      YOUTUBE_CACHE.LATEST_VIDEOS_KEY, 
      JSON.stringify(cachePayload), 
      'EX', 
      YOUTUBE_CACHE.SEARCH_TTL_SEC
    );

    return {
      data: pool.slice(skip, skip + limit),
      currentPage,
      pageSize: limit,
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit) || 1,
    };
  }
}