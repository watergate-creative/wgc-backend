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
  MaxLength,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventStatus, EventType } from '../entities/event.entity.js';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';

// ─── DAILY SCHEDULE ────────────────────────────────────────────

export enum DayOfWeek {
  MONDAY = 'Monday',
  TUESDAY = 'Tuesday',
  WEDNESDAY = 'Wednesday',
  THURSDAY = 'Thursday',
  FRIDAY = 'Friday',
  SATURDAY = 'Saturday',
  SUNDAY = 'Sunday',
}

export enum SessionPeriod {
  MORNING = 'Morning',
  AFTERNOON = 'Afternoon',
  EVENING = 'Evening',
}

export class DailyScheduleDto {
  @ApiProperty({ enum: DayOfWeek, example: DayOfWeek.MONDAY, description: 'Day of the week' })
  @IsEnum(DayOfWeek)
  @IsNotEmpty()
  day: DayOfWeek;

  @ApiProperty({ enum: SessionPeriod, example: SessionPeriod.MORNING, description: 'Session period' })
  @IsEnum(SessionPeriod)
  @IsNotEmpty()
  session: SessionPeriod;

  @ApiProperty({ example: '9:00 AM', description: 'Time of the session' })
  @IsString()
  @IsNotEmpty()
  time: string;
}

// ─── CREATE EVENT ──────────────────────────────────────────────

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

  @ApiProperty({
    type: [DailyScheduleDto],
    description: 'Daily session schedule array',
    example: [
      { day: 'Monday', session: 'Morning', time: '9:00 AM' },
      { day: 'Monday', session: 'Evening', time: '6:00 PM' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DailyScheduleDto)
  dailySchedule: DailyScheduleDto[];

  @ApiProperty({ example: 'The WaterGate Church, Jendol Bus-Stop, Oju Ore, Ota' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  location: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/xxx/image/upload/banner.jpg' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  bannerImageUrl?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ enum: EventStatus, default: EventStatus.DRAFT })
  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;

  @ApiProperty({ enum: EventType, description: 'Type of event' })
  @IsEnum(EventType)
  type: EventType;
}

// ─── UPDATE EVENT ──────────────────────────────────────────────

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

  @ApiPropertyOptional({
    type: [DailyScheduleDto],
    description: 'Daily session schedule array',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DailyScheduleDto)
  @IsOptional()
  dailySchedule?: DailyScheduleDto[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  location?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  bannerImageUrl?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ enum: EventStatus })
  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;

  @ApiPropertyOptional({ enum: EventType })
  @IsEnum(EventType)
  @IsOptional()
  type?: EventType;
}

// ─── QUERY ─────────────────────────────────────────────────────

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

