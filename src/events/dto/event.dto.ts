import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsArray,
  IsUUID,
  MaxLength,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventStatus, EventType } from '../entities/event.entity.js';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';



export class CreateEventDto {
  @ApiProperty({ example: 'Partakers of the Holy Ghost' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @ApiProperty({ example: 'At WaterGate Church, our events are moments of alignment...' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '2025-12-18T00:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: '2025-12-21T00:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiPropertyOptional({ example: '9:00AM' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  startTime?: string;

  @ApiProperty({ example: 'The WaterGate Church, Jendol Bus-Stop, Oju Ore, Ota' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  location: string;

  @ApiPropertyOptional({ example: 'Gloryland, Sango Ota, Ogun State' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/xxx/image/upload/banner.jpg' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  bannerImageUrl?: string;

  @ApiPropertyOptional({ example: 500 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isFree?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isRegistrationRequired?: boolean;

  @ApiPropertyOptional({ enum: EventStatus, default: EventStatus.DRAFT })
  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'Array of Minister IDs' })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  ministerIds?: string[];

  @ApiPropertyOptional({ enum: EventType, description: 'Type of event' })
  @IsEnum(EventType)
  @IsOptional()
  type?: EventType;
}

export class UpdateEventDto {
  @ApiPropertyOptional({ example: 'Partakers of the Holy Ghost 2025' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(100)
  startTime?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  location?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  bannerImageUrl?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isFree?: boolean;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isRegistrationRequired?: boolean;

  @ApiPropertyOptional({ enum: EventStatus })
  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'Array of Minister IDs' })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  ministerIds?: string[];

  @ApiPropertyOptional({ enum: EventType })
  @IsEnum(EventType)
  @IsOptional()
  type?: EventType;
}

export class EventQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: EventType, description: 'Filter by event type' })
  @IsEnum(EventType)
  @IsOptional()
  type?: EventType;

  @ApiPropertyOptional({ enum: EventStatus, description: 'Filter by event status' })
  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;

  @ApiPropertyOptional({ description: 'Search in title and description' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter events starting from this date' })
  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Filter events until this date' })
  @IsDateString()
  @IsOptional()
  toDate?: string;
}
