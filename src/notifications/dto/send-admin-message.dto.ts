import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MaxLength,
  IsArray,
} from 'class-validator';

export enum MessageCategory {
  SAFETY = 'SAFETY',
  LEADERSHIP_UPDATE = 'LEADERSHIP_UPDATE',
  CRITICAL_ALERT = 'CRITICAL_ALERT',
  POLICY_CHANGE = 'POLICY_CHANGE',
}

export enum MessagePriority {
  HIGH = 'HIGH',
  NORMAL = 'NORMAL',
}

export class SendAdminMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject: string;

  @IsString()
  @IsNotEmpty()
  htmlContent: string;

  @IsEnum(MessageCategory)
  @IsNotEmpty()
  category: MessageCategory;

  @IsEnum(MessagePriority)
  @IsOptional()
  priority?: MessagePriority = MessagePriority.NORMAL;

  // Optional audience filters
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roles?: string[];
}
