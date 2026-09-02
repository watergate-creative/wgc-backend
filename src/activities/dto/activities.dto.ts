import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';
import { ActivityAction } from '../entities/activity-log.entity.js';

export interface LogActivityParams {
  action: ActivityAction;
  userId?: string;
  participantId?: string;
  details?: string;
  ipAddress?: string;
}

export interface ActivityResponseItem {
  id: string;
  action: ActivityAction;
  details: string | null;
  ipAddress: string | null;
  timestamp: Date;
  userId: string | null;
  participantId: string | null;
  username: string | null;
  actorType: 'USER' | 'PARTICIPANT' | null;
}

export class ActivityQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ActivityAction, description: 'Filter by action' })
  @IsEnum(ActivityAction)
  @IsOptional()
  action?: ActivityAction;

  @ApiPropertyOptional({ description: 'Filter by userId' })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by participantId' })
  @IsUUID()
  @IsOptional()
  participantId?: string;
}
