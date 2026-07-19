// application/dto/youtube.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common'; // Adjust path as needed

export class YoutubeSearchQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by video title or description' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter videos by playlist category name (e.g. Backend, DevOps)' })
  @IsString()
  @IsOptional()
  category?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  currentPage: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}