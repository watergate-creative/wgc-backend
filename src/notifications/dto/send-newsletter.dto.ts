import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsUUID,
  MaxLength,
} from 'class-validator';

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
