import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, MoreThan } from 'typeorm';
import { MinisterProfile } from './entities/minister-profile.entity.js';
import { TimeBlock } from './entities/time-block.entity.js';
import { Session, SessionStatus } from './entities/session.entity.js';
import { GoogleCalendarService } from './google-calendar.service.js';
import {
  BookSessionDto,
  CreateMinisterProfileDto,
  CreateTimeBlockDto,
} from './dto/sessions.dto.js';
import { NotificationService } from '../notifications/notification.service.js';
import {
  NotificationType,
  DeliveryChannel,
} from '../notifications/types/notification-types.js';
import {
  WeeklyAvailability,
  DAYS_OF_WEEK,
  DayOfWeek,
} from './interfaces/availability.interface.js';
import { AvailabilityEngine } from './utils/availability.engine.js';

export interface TimeRange {
  start: Date;
  end: Date;
}

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    @InjectRepository(MinisterProfile)
    private readonly profileRepository: Repository<MinisterProfile>,
    @InjectRepository(TimeBlock)
    private readonly timeBlockRepository: Repository<TimeBlock>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly notificationService: NotificationService,
  ) {}

  // ─── MINISTER PROFILE MANAGEMENT ─────────────────────────────────

  async createProfile(
    userId: string,
    dto: CreateMinisterProfileDto,
  ): Promise<MinisterProfile> {
    const existing = await this.profileRepository.findOne({ where: { userId } });
    if (existing) {
      throw new ConflictException('A minister profile already exists for this user');
    }

    const profile = this.profileRepository.create({
      userId,
      title: dto.title,
      sessionDurationMinutes: dto.sessionDurationMinutes ?? 60,
    });

    return this.profileRepository.save(profile);
  }

  async getProfile(userId: string): Promise<MinisterProfile> {
    const profile = await this.profileRepository.findOne({
      where: { userId },
      relations: { user: true },
    });

    if (!profile) {
      throw new NotFoundException('No minister profile found for this user');
    }

    return profile;
  }

  async updateWeeklyAvailability(
    userId: string,
    availability: WeeklyAvailability,
  ): Promise<MinisterProfile> {
    const profile = await this.getProfile(userId);
    profile.weeklyAvailability = availability;
    return this.profileRepository.save(profile);
  }

  async saveGoogleRefreshToken(userId: string, token: string): Promise<void> {
    const profile = await this.getProfile(userId);
    profile.googleRefreshToken = token;
    await this.profileRepository.save(profile);
  }

  // ─── TIME BLOCKS ────────────────────────────────────────────────

  async createTimeBlock(
    userId: string,
    dto: CreateTimeBlockDto,
  ): Promise<TimeBlock> {
    const profile = await this.getProfile(userId);

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (endTime <= startTime) {
      throw new BadRequestException('endTime must be after startTime');
    }

    // Check for overlapping blocks
    const overlapping = await this.timeBlockRepository
      .createQueryBuilder('b')
      .where('b.ministerId = :ministerId', { ministerId: profile.id })
      .andWhere('b.startTime < :endTime', { endTime })
      .andWhere('b.endTime > :startTime', { startTime })
      .getCount();

    if (overlapping > 0) {
      throw new ConflictException(
        'This time block overlaps with an existing block',
      );
    }

    const block = this.timeBlockRepository.create({
      startTime,
      endTime,
      reason: dto.reason,
      ministerId: profile.id,
    });

    return this.timeBlockRepository.save(block);
  }

  async getTimeBlocks(userId: string): Promise<TimeBlock[]> {
    const profile = await this.getProfile(userId);
    return this.timeBlockRepository.find({
      where: { ministerId: profile.id },
      order: { startTime: 'ASC' },
    });
  }

  async deleteTimeBlock(userId: string, blockId: string): Promise<void> {
    const profile = await this.getProfile(userId);
    const block = await this.timeBlockRepository.findOne({
      where: { id: blockId, ministerId: profile.id },
    });

    if (!block) {
      throw new NotFoundException('Time block not found');
    }

    await this.timeBlockRepository.remove(block);
  }

  // ─── PUBLIC: LIST MINISTERS ──────────────────────────────────────

  async getAllMinisters(): Promise<MinisterProfile[]> {
    return this.profileRepository.find({
      relations: { user: true },
      where: { user: { isActive: true } },
      select: {
        id: true,
        title: true,
        sessionDurationMinutes: true,
        weeklyAvailability: true,
        createdAt: true,
        user: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    });
  }

  // ─── PUBLIC: AVAILABILITY COMPUTATION ───────────────────────────

  async getAvailability(
    ministerId: string,
    startDate: string,
    endDate: string,
  ) {
    const profile = await this.profileRepository.findOne({
      where: { id: ministerId },
      relations: { user: true },
    });

    if (!profile) {
      throw new NotFoundException('Minister profile not found');
    }

    // Explicitly load the refresh token (select: false by default)
    const profileWithToken = await this.profileRepository
      .createQueryBuilder('p')
      .addSelect('p.googleRefreshToken')
      .where('p.id = :id', { id: ministerId })
      .getOne();

    const start = new Date(startDate);
    const end = new Date(endDate);

    // 1. Collect all busy ranges
    const busyRanges = await this.collectBusyRanges(
      profile.id,
      start,
      end,
      profileWithToken?.googleRefreshToken ?? null,
      profile.calendarId,
    );

    // 2. Compute available slots from weekly availability
    const availableSlots = AvailabilityEngine.computeAvailableSlots(
      profile.weeklyAvailability,
      profile.sessionDurationMinutes,
      start,
      end,
      busyRanges,
    );

    return {
      minister: {
        id: profile.id,
        title: profile.title,
        firstName: profile.user.firstName,
        lastName: profile.user.lastName,
        sessionDurationMinutes: profile.sessionDurationMinutes,
      },
      availableSlots,
    };
  }

  /**
   * Collects all busy time ranges from:
   * 1. Existing booked sessions
   * 2. Manual time blocks
   * 3. Google Calendar events (if connected)
   */
  private async collectBusyRanges(
    ministerId: string,
    start: Date,
    end: Date,
    googleRefreshToken: string | null,
    calendarId: string,
  ): Promise<TimeRange[]> {
    // Booked sessions
    const bookedSessions = await this.sessionRepository.find({
      where: {
        ministerId,
        status: SessionStatus.SCHEDULED,
        startTime: Between(start, end),
      },
    });

    // Manual blocks
    const manualBlocks = await this.timeBlockRepository
      .createQueryBuilder('b')
      .where('b.ministerId = :ministerId', { ministerId })
      .andWhere('b.startTime < :end', { end })
      .andWhere('b.endTime > :start', { start })
      .getMany();

    // Google Calendar busy slots
    let googleBusySlots: TimeRange[] = [];
    if (googleRefreshToken) {
      googleBusySlots = await this.googleCalendarService.getBusySlots(
        googleRefreshToken,
        start,
        end,
        calendarId,
      );
    }

    return [
      ...bookedSessions.map((s) => ({ start: s.startTime, end: s.endTime })),
      ...manualBlocks.map((b) => ({ start: b.startTime, end: b.endTime })),
      ...googleBusySlots,
    ];
  }



  // ─── PUBLIC: BOOK A SESSION ─────────────────────────────────────

  async bookSession(
    ministerId: string,
    dto: BookSessionDto,
  ): Promise<Session> {
    const profile = await this.profileRepository.findOne({
      where: { id: ministerId },
      relations: { user: true },
    });

    if (!profile) {
      throw new NotFoundException('Minister not found');
    }

    const start = new Date(dto.startTime);
    const end = new Date(
      start.getTime() + profile.sessionDurationMinutes * 60_000,
    );

    if (start <= new Date()) {
      throw new BadRequestException('Cannot book a session in the past');
    }

    // ── Double-booking guard ──────────────────────────────────────
    // Check for overlapping scheduled sessions
    const conflictingSession = await this.sessionRepository
      .createQueryBuilder('s')
      .where('s.ministerId = :ministerId', { ministerId })
      .andWhere('s.status = :status', { status: SessionStatus.SCHEDULED })
      .andWhere('s.startTime < :end', { end })
      .andWhere('s.endTime > :start', { start })
      .getCount();

    if (conflictingSession > 0) {
      throw new ConflictException(
        'This time slot is already booked. Please choose another time.',
      );
    }

    // Check for overlapping manual blocks
    const conflictingBlock = await this.timeBlockRepository
      .createQueryBuilder('b')
      .where('b.ministerId = :ministerId', { ministerId })
      .andWhere('b.startTime < :end', { end })
      .andWhere('b.endTime > :start', { start })
      .getCount();

    if (conflictingBlock > 0) {
      throw new ConflictException(
        'This time slot has been blocked by the minister.',
      );
    }

    // Check Google Calendar conflict
    const profileWithToken = await this.profileRepository
      .createQueryBuilder('p')
      .addSelect('p.googleRefreshToken')
      .where('p.id = :id', { id: ministerId })
      .getOne();

    if (profileWithToken?.googleRefreshToken) {
      const googleBusy = await this.googleCalendarService.getBusySlots(
        profileWithToken.googleRefreshToken,
        start,
        end,
        profile.calendarId,
      );

      if (AvailabilityEngine.overlapsAny(start, end, googleBusy)) {
        throw new ConflictException(
          'This time slot conflicts with the minister\'s Google Calendar.',
        );
      }
    }

    // ── Create the session ────────────────────────────────────────
    const session = this.sessionRepository.create({
      guestName: dto.guestName,
      guestEmail: dto.guestEmail,
      guestPhone: dto.guestPhone,
      purpose: dto.purpose,
      startTime: start,
      endTime: end,
      ministerId: profile.id,
    });

    const saved = await this.sessionRepository.save(session);

    // Send confirmation via unified notification service
    this.notificationService
      .send({
        type: NotificationType.SESSION_BOOKING_CONFIRMATION,
        channels: [DeliveryChannel.EMAIL],
        recipient: {
          email: dto.guestEmail,
          phone: dto.guestPhone ?? undefined,
          name: dto.guestName,
        },
        context: {
          guestName: dto.guestName,
          ministerTitle: profile.title,
          ministerName: `${profile.user.firstName} ${profile.user.lastName}`,
          sessionDate: start.toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          sessionTime: start.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          durationMinutes: profile.sessionDurationMinutes,
          purpose: dto.purpose ?? 'Not specified',
          sessionId: saved.id,
          year: new Date().getFullYear(),
        },
      })
      .catch((e) =>
        this.logger.error(`Failed to send booking notification: ${e.message}`),
      );

    return saved;
  }

  // ─── MINISTER: CANCEL SESSION ───────────────────────────────────

  async cancelSession(userId: string, sessionId: string): Promise<Session> {
    const profile = await this.getProfile(userId);
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, ministerId: profile.id },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status !== SessionStatus.SCHEDULED) {
      throw new BadRequestException('Only scheduled sessions can be cancelled');
    }

    session.status = SessionStatus.CANCELLED;
    return this.sessionRepository.save(session);
  }

  // ─── MINISTER: LIST THEIR SESSIONS ──────────────────────────────

  async getMinisterSessions(userId: string): Promise<Session[]> {
    const profile = await this.getProfile(userId);
    return this.sessionRepository.find({
      where: { ministerId: profile.id },
      order: { startTime: 'ASC' },
    });
  }
}
