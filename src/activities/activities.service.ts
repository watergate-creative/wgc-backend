import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog, ActivityAction } from './entities/activity-log.entity.js';
import { ActivityQueryDto, ActivityResponseItem, LogActivityParams } from './dto/activities.dto.js';

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityRepository: Repository<ActivityLog>,
  ) {}

  async logActivity(params: LogActivityParams): Promise<void> {
    try {
      const activity = this.activityRepository.create(params);
      await this.activityRepository.save(activity);
    } catch (error) {

      this.logger.error(`Failed to log activity: ${error.message}`, error.stack);
    }
  }

  async getActivities(query: ActivityQueryDto): Promise<{ data: ActivityResponseItem[]; total: number }> {
    const qb = this.activityRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.user', 'user')
      .leftJoinAndSelect('activity.participant', 'participant')
      .orderBy('activity.createdAt', 'DESC')
      .skip(query.skip)
      .take(query.limit);

    if (query.action) {
      qb.andWhere('activity.action = :action', { action: query.action });
    }
    if (query.userId) {
      qb.andWhere('activity.userId = :userId', { userId: query.userId });
    }
    if (query.participantId) {
      qb.andWhere('activity.participantId = :participantId', { participantId: query.participantId });
    }

    const [activities, total] = await qb.getManyAndCount();

    const data: ActivityResponseItem[] = activities.map(activity => {
      const actorEmail = activity.user?.email ?? activity.participant?.email ?? null;
      const actorType: 'USER' | 'PARTICIPANT' | null = activity.user
        ? 'USER'
        : activity.participant
          ? 'PARTICIPANT'
          : null;

      return {
        id: activity.id,
        action: activity.action,
        details: activity.details ?? null,
        ipAddress: activity.ipAddress ?? null,
        timestamp: activity.createdAt,
        userId: activity.userId ?? null,
        participantId: activity.participantId ?? null,
        username: actorEmail ? actorEmail.split('@')[0] : null,
        actorType,
      };
    });

    return { data, total };
  }
}
