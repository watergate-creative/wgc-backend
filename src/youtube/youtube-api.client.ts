// infrastructure/youtube-api.client.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom, retry, catchError, throwError } from 'rxjs';
import { YOUTUBE_API } from './youtube.constants';
import { AxiosResponse } from 'axios';

interface YoutubeApiResponse {
  items?: any[];
  nextPageToken?: string;
}

export interface PlaylistSummary {
  playlistId: string;
  title: string;
}

@Injectable()
export class YoutubeApiClient {
  private readonly logger = new Logger(YoutubeApiClient.name);
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.getOrThrow<string>('YOUTUBE_API_KEY');
  }

  async fetchAllChannelVideos(channelId: string): Promise<any[]> {
    const allItems: any[] = [];
    let nextPageToken: string | undefined = undefined;

    do {
      const stream$ = this.httpService.get<YoutubeApiResponse>(YOUTUBE_API.SEARCH_URL, {
        params: {
          key: this.apiKey,
          channelId,
          part: 'snippet',
          order: 'date',
          maxResults: 50,
          pageToken: nextPageToken,
        },
      }).pipe(
        retry({ count: YOUTUBE_API.RETRY_COUNT, delay: YOUTUBE_API.RETRY_DELAY_MS }),
        catchError(err => this.handleError('Search API Failed during pagination', err)),
      );

      const response: AxiosResponse<YoutubeApiResponse> = await lastValueFrom(stream$);
      
      const items = response.data.items?.filter((item: any) => item.id?.videoId) || [];
      allItems.push(...items);

      nextPageToken = response.data.nextPageToken;
      
      this.logger.debug(`Fetched page of ${items.length} videos. Total aggregated: ${allItems.length}`);
    } while (nextPageToken);

    return allItems;
  }

  /**
   * Fetches all playlists created by the channel.
   * Cost: 1 Quota Unit per page.
   */
  async fetchChannelPlaylists(channelId: string): Promise<PlaylistSummary[]> {
    const playlists: PlaylistSummary[] = [];
    let nextPageToken: string | undefined = undefined;

    do {
      const stream$ = this.httpService.get<YoutubeApiResponse>(YOUTUBE_API.PLAYLISTS_URL, {
        params: {
          key: this.apiKey,
          channelId,
          part: 'snippet',
          maxResults: 50,
          pageToken: nextPageToken,
        },
      }).pipe(
        retry({ count: YOUTUBE_API.RETRY_COUNT, delay: YOUTUBE_API.RETRY_DELAY_MS }),
        catchError(err => this.handleError('Playlists API Failed during pagination', err)),
      );

      const response: AxiosResponse<YoutubeApiResponse> = await lastValueFrom(stream$);
      const items = response.data.items || [];
      
      for (const item of items) {
        if (item.id && item.snippet?.title) {
          playlists.push({ playlistId: item.id, title: item.snippet.title });
        }
      }

      nextPageToken = response.data.nextPageToken;
    } while (nextPageToken);

    return playlists;
  }

  /**
   * Fetches all video IDs inside a specific playlist.
   * Cost: 1 Quota Unit per page.
   */
  async fetchPlaylistItems(playlistId: string): Promise<string[]> {
    const videoIds: string[] = [];
    let nextPageToken: string | undefined = undefined;

    do {
      const stream$ = this.httpService.get<YoutubeApiResponse>(YOUTUBE_API.PLAYLIST_ITEMS_URL, {
        params: {
          key: this.apiKey,
          playlistId,
          part: 'snippet',
          maxResults: 50,
          pageToken: nextPageToken,
        },
      }).pipe(
        retry({ count: YOUTUBE_API.RETRY_COUNT, delay: YOUTUBE_API.RETRY_DELAY_MS }),
        catchError(err => this.handleError(`PlaylistItems API Failed for playlist ${playlistId}`, err)),
      );

      const response: AxiosResponse<YoutubeApiResponse> = await lastValueFrom(stream$);
      const items = response.data.items || [];
      
      for (const item of items) {
        const vId = item.snippet?.resourceId?.videoId;
        if (vId) videoIds.push(vId);
      }

      nextPageToken = response.data.nextPageToken;
    } while (nextPageToken);

    return videoIds;
  }

  async fetchVideoDetails(videoIds: string[]): Promise<any[]> {
    if (videoIds.length === 0) return [];

    const CHUNK_SIZE = 50;
    const allDetails: any[] = [];

    for (let i = 0; i < videoIds.length; i += CHUNK_SIZE) {
      const chunk = videoIds.slice(i, i + CHUNK_SIZE);
      
      const stream$ = this.httpService.get<YoutubeApiResponse>(YOUTUBE_API.VIDEOS_URL, {
        params: {
          key: this.apiKey,
          id: chunk.join(','),
          part: 'contentDetails',
        },
      }).pipe(
        retry({ count: YOUTUBE_API.RETRY_COUNT, delay: YOUTUBE_API.RETRY_DELAY_MS }),
        catchError(err => this.handleError('Content Details API Failed for chunk', err)),
      );

      const response: AxiosResponse<YoutubeApiResponse> = await lastValueFrom(stream$);
      
      if (response.data.items) {
        allDetails.push(...response.data.items);
      }
    }

    return allDetails;
  }

  private handleError(context: string, error: any) {
    this.logger.error(`${context}: ${error.message}`, error.stack);
    return throwError(() => new Error(`${context} execution stopped.`));
  }
}