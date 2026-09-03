import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';
import { Transform } from 'class-transformer';

export class RegisterParticipantDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'MALE or FEMALE' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  placeOfWorship?: string;

  @ApiPropertyOptional({ type: Boolean })
  @Transform(({ value }) => {

    if (value === 'true' || value === true) return true;
    return false;
  })
  @IsBoolean()
  @IsOptional()
  accommodation?: boolean;

  @ApiProperty()
  @IsBoolean()
  consent: boolean;

  @ApiProperty()
  @IsBoolean()
  contactConsent: boolean;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  selectedDays: string[];
}

export class BulkRegistrationDto {
  @ApiProperty({ type: [String], description: 'Array of Event IDs' })
  @IsArray()
  @IsUUID('4', { each: true })
  eventIds: string[];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  placeOfWorship?: string;
}

export class ParticipantQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by attendance status' })
  @IsBoolean()
  @IsOptional()
  hasAttended?: boolean;

  @ApiPropertyOptional({ description: 'Search by name or email' })
  @IsString()
  @IsOptional()
  search?: string;
}
