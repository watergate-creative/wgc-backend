import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormEntry } from './entities/form-entry.entity.js';
import {
  CreateFormEntryDto,
  UpdateFormEntryDto,
  FormEntryQueryDto,
} from './dto/form.dto.js';
import { EmailService } from '../email/email.service.js';
import { TermiiService } from '../notifications/termii.service.js';

@Injectable()
export class FormsService {
  private readonly logger = new Logger(FormsService.name);

  constructor(
    @InjectRepository(FormEntry)
    private readonly formEntryRepository: Repository<FormEntry>,
    private readonly emailService: EmailService,
    private readonly termiiService: TermiiService,
  ) {}

  // ─── CREATE (Public submission) ──────────────────────────────

  async create(dto: CreateFormEntryDto): Promise<FormEntry> {
    const entry = this.formEntryRepository.create(dto);
    const saved = await this.formEntryRepository.save(entry);
    this.logger.log(
      `Form entry created: type="${saved.type}" from ${saved.email}`,
    );

    // Fire-and-forget: email first, SMS fallback
    this.sendNotification(saved).catch(() => {});

    return saved;
  }

  // ─── NOTIFICATION: EMAIL-FIRST, SMS FALLBACK ─────────────────

  private async sendNotification(entry: FormEntry): Promise<void> {
    try {
      // Attempt email first
      await this.emailService.sendFormSubmissionEmail(entry.email, {
        fullName: entry.fullName,
        formType: entry.type,
        data: entry.data,
      });

      this.logger.log(
        `Form notification email sent to ${entry.email} for type="${entry.type}"`,
      );
    } catch (emailError: any) {
      this.logger.warn(
        `Email notification failed for ${entry.email}: ${emailError.message}. Falling back to SMS.`,
      );

      // Fallback to SMS only if phone is provided and email failed
      if (entry.phone) {
        try {
          const smsMessage = this.buildSmsMessage(entry);
          await this.termiiService.sendSms({
            to: entry.phone,
            sms: smsMessage,
          });

          this.logger.log(
            `SMS fallback sent to ${entry.phone} for type="${entry.type}"`,
          );
        } catch (smsError: any) {
          this.logger.error(
            `SMS fallback also failed for ${entry.phone}: ${smsError.message}`,
          );
        }
      } else {
        this.logger.warn(
          `No phone number available for SMS fallback. Notification skipped entirely for ${entry.email}.`,
        );
      }
    }
  }

  private buildSmsMessage(entry: FormEntry): string {
    const messages: Record<string, string> = {
      'Volunteer': `Hi ${entry.fullName}, thank you for signing up to volunteer at WaterGate Church! Our team will reach out to you shortly.`,
      'Naming Ceremony': `Hi ${entry.fullName}, your naming ceremony registration has been received. We will contact you to confirm the details.`,
      'New Comers': `Hi ${entry.fullName}, welcome to WaterGate Church! We are so glad you connected with us. Expect a follow-up from our team.`,
      'Altar Call': `Hi ${entry.fullName}, what a beautiful decision! We are here to support you. Someone from our pastoral team will be in touch.`,
      'Pre-Marital Counselling': `Hi ${entry.fullName}, your pre-marital counselling registration has been received. Our counselling team will reach out to schedule your sessions.`,
      'Counselling': `Hi ${entry.fullName}, your counselling request has been received. A member of our team will contact you to arrange a session.`,
      'Feedback': `Hi ${entry.fullName}, thank you for your feedback! Your thoughts help us serve better.`,
      'Testimony': `Hi ${entry.fullName}, thank you for sharing your testimony! Your story is an encouragement to us all.`,
    };
    return messages[entry.type] || `Hi ${entry.fullName}, your form submission has been received. Thank you!`;
  }

  // ─── FIND ALL (Admin, paginated + filtered) ──────────────────

  async findAll(
    query: FormEntryQueryDto,
  ): Promise<{ data: FormEntry[]; total: number }> {
    const qb = this.formEntryRepository.createQueryBuilder('entry');

    if (query.type) {
      qb.andWhere('entry.type = :type', { type: query.type });
    }

    if (query.email) {
      qb.andWhere('entry.email = :email', { email: query.email });
    }

    if (query.search) {
      qb.andWhere('LOWER(entry.fullName) LIKE LOWER(:search)', {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy('entry.createdAt', 'DESC')
      .skip(query.skip)
      .take(query.limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  // ─── FIND ONE ────────────────────────────────────────────────

  async findOne(id: string): Promise<FormEntry> {
    const entry = await this.formEntryRepository.findOne({
      where: { id },
    });
    if (!entry) {
      throw new NotFoundException(`Form entry with ID "${id}" not found`);
    }
    return entry;
  }

  // ─── UPDATE (Admin) ──────────────────────────────────────────

  async update(id: string, dto: UpdateFormEntryDto): Promise<FormEntry> {
    const entry = await this.findOne(id);
    Object.assign(entry, dto);
    const updated = await this.formEntryRepository.save(entry);
    this.logger.log(`Form entry updated: ${id}`);
    return updated;
  }

  // ─── DELETE (Admin, soft-delete) ─────────────────────────────

  async remove(id: string): Promise<void> {
    const entry = await this.findOne(id);
    await this.formEntryRepository.softRemove(entry);
    this.logger.log(`Form entry soft-deleted: ${id}`);
  }
}
