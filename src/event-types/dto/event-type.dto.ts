import { IsString, IsBoolean, IsOptional, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEventTypeDto {
  @ApiProperty({ example: 'ETHANIM', description: 'The display name of the event type' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'ethanim', description: 'A unique URL-friendly identifier' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug can only contain lowercase letters, numbers, and hyphens' })
  slug: string;

  @ApiPropertyOptional({ example: 'Annual gathering...', description: 'Optional description of the event type' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether this event type is active and selectable' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateEventTypeDto {
  @ApiPropertyOptional({ example: 'ETHANIM', description: 'The display name of the event type' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'ethanim', description: 'A unique URL-friendly identifier' })
  @IsString()
  @IsOptional()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug can only contain lowercase letters, numbers, and hyphens' })
  slug?: string;

  @ApiPropertyOptional({ example: 'Annual gathering...', description: 'Optional description of the event type' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: false, description: 'Whether this event type is active and selectable' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
