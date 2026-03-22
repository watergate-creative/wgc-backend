import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Participant } from './entities/participant.entity.js';
import { RegisterParticipantDto, BulkRegistrationDto, ParticipantQueryDto } from './dto/participant.dto.js';
import { EventsService } from '../events/events.service.js';
import { EmailService } from '../email/email.service.js';
import { EventStatus } from '../events/entities/event.entity.js';
import { TermiiService } from '../notifications/termii.service.js';

@Injectable()
export class ParticipantService {
  private readonly logger = new Logger(ParticipantService.name);

  constructor(
    @InjectRepository(Participant)
    private readonly participantRepository: Repository<Participant>,
    private readonly eventsService: EventsService,
    private readonly emailService: EmailService,
    private readonly termiiService: TermiiService,
  ) {}

  async register(
    eventId: string,
    dto: RegisterParticipantDto,
  ): Promise<Participant> {
    const event = await this.eventsService.findOne(eventId);

    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException('This event is not currently accepting registrations');
    }

    if (event.capacity && event.registrationCount >= event.capacity) {
      throw new BadRequestException('This event has reached its maximum capacity');
    }

    const email = dto.email.toLowerCase();

    // Prevent duplicate registration for the *same* event
    const existing = await this.participantRepository.findOne({
      where: { eventId, email },
    });

    if (existing) {
      throw new ConflictException('You are already registered for this event');
    }

    const participant = this.participantRepository.create({
      ...dto,
      email,
      eventId,
    });

    const saved = await this.participantRepository.save(participant);
    await this.eventsService.incrementRegistrationCount(eventId);

    this.sendConfirmationEmail(email, dto.firstName, event);
    
    // Trigger Termii SMS Notification if phone is provided
    if (dto.phone) {
      const smsMessage = `Hi ${dto.firstName}, your registration for ${event.title} is confirmed. We look forward to seeing you! - WGC`;
      this.termiiService.sendSms({ to: dto.phone, sms: smsMessage }).catch((e) => {
        this.logger.error(`SMS Error: ${e.message}`);
      });
    }

    this.logger.log(`New participant registration for event "${event.title}": ${email}`);

    return saved;
  }

  async registerBulk(dto: BulkRegistrationDto): Promise<{
    successful: { eventId: string; participantId: string }[];
    failed: { eventId: string; reason: string }[];
  }> {
    const successful: { eventId: string; participantId: string }[] = [];
    const failed: { eventId: string; reason: string }[] = [];

    for (const eventId of dto.eventIds) {
      try {
        const participant = await this.register(eventId, {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          phone: dto.phone,
          gender: dto.gender,
          address: dto.address,
          placeOfWorship: dto.placeOfWorship,
        });
        successful.push({ eventId, participantId: participant.id });
      } catch (error) {
        failed.push({
          eventId,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { successful, failed };
  }

  async checkIn(eventId: string, participantId: string): Promise<Participant> {
    const participant = await this.participantRepository.findOne({
      where: { id: participantId, eventId },
    });

    if (!participant) {
      throw new NotFoundException('Participant registration not found for this event');
    }

    if (participant.hasAttended) {
      throw new BadRequestException('Participant has already checked in');
    }

    participant.hasAttended = true;
    participant.checkInTime = new Date();
    
    const updated = await this.participantRepository.save(participant);
    this.logger.log(`Participant checked in: ${participantId} for event ${eventId}`);
    
    return updated;
  }

  async getParticipantsForEvent(
    eventId: string,
    query: ParticipantQueryDto,
  ): Promise<{ data: Participant[]; total: number }> {
    await this.eventsService.findOne(eventId);

    const qb = this.participantRepository
      .createQueryBuilder('p')
      .where('p.eventId = :eventId', { eventId });

    if (query.hasAttended !== undefined) {
      qb.andWhere('p.hasAttended = :hasAttended', { hasAttended: query.hasAttended });
    }

    if (query.search) {
      qb.andWhere(
        '(LOWER(p.firstName) LIKE LOWER(:search) OR LOWER(p.lastName) LIKE LOWER(:search) OR LOWER(p.email) LIKE LOWER(:search))',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy('p.createdAt', 'DESC')
      .skip(query.skip)
      .take(query.limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async getRegistrationsByEmail(
    email: string,
    query: ParticipantQueryDto,
  ): Promise<{ data: Participant[]; total: number }> {
    const qb = this.participantRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.event', 'event')
      .where('p.email = :email', { email: email.toLowerCase() });

    if (query.hasAttended !== undefined) {
      qb.andWhere('p.hasAttended = :hasAttended', { hasAttended: query.hasAttended });
    }

    qb.orderBy('p.createdAt', 'DESC')
      .skip(query.skip)
      .take(query.limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async removeRegistration(eventId: string, participantId: string): Promise<void> {
    const participant = await this.participantRepository.findOne({
      where: { id: participantId, eventId },
    });

    if (!participant) {
      throw new NotFoundException('Participant registration not found');
    }

    await this.participantRepository.softRemove(participant);
    await this.eventsService.decrementRegistrationCount(eventId);
    this.logger.log(`Participant registration removed: ${participantId}`);
  }

  private sendConfirmationEmail(email: string, firstName: string, event: any): void {
    this.emailService
      .sendRegistrationConfirmation(email, {
        firstName,
        eventTitle: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        startTime: event.startTime,
        location: event.location,
        address: event.address,
      })
      .catch((error) => {
        this.logger.error(
          `Failed to send confirmation email to ${email}: ${error.message}`,
        );
      });
  }
}