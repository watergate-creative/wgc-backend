import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * DTO for announcing an upcoming program via the admin endpoint.
 */
export class ProgramAnnouncementDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  programName: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  location: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  bannerImageUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  actionUrl?: string;

  // ── Audience filter ──

  @IsUUID()
  @IsOptional()
  eventId?: string;

  @IsBoolean()
  @IsOptional()
  hasContactConsent?: boolean;

  @IsBoolean()
  @IsOptional()
  hasAttended?: boolean;
}
