import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * DTO for sending a newsletter broadcast via the admin endpoint.
 */
export class SendNewsletterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject: string;

  @IsString()
  @IsNotEmpty()
  htmlContent: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  preheader?: string;

  // ── Audience filter (optional, defaults to all consented participants) ──

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
