import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import * as availability from '../interfaces/availability.interface.js';

export class CreateTimeBlockDto {
  @ApiProperty({ example: '2026-09-01T09:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ example: '2026-09-01T12:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @ApiPropertyOptional({ example: 'Personal appointment' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class BookSessionDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  guestName: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  guestEmail: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsString()
  @IsOptional()
  guestPhone?: string;

  @ApiProperty({
    description: 'Start time of the desired slot. End time is computed from the minister\'s sessionDurationMinutes.',
    example: '2026-09-01T10:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiPropertyOptional({ example: 'Marriage counselling' })
  @IsString()
  @IsOptional()
  purpose?: string;
}

export class UpdateWeeklyAvailabilityDto {
  @ApiProperty({
    description: 'Weekly availability keyed by day name',
    example: {
      Monday: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '17:00' }],
      Wednesday: [{ start: '10:00', end: '16:00' }],
    },
  })
  @IsObject()
  @IsNotEmpty()
  weeklyAvailability: availability.WeeklyAvailability;
}

export class CreateMinisterProfileDto {
  @ApiProperty({ example: 'Serving Overseer' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ default: 60, description: 'Duration of a single bookable session in minutes' })
  @IsInt()
  @Min(15)
  @Max(180)
  @IsOptional()
  sessionDurationMinutes?: number;
}
