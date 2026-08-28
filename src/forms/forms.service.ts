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
import { NotificationService } from '../notifications/notification.service.js';
import {
  NotificationType,
  DeliveryChannel,
} from '../notifications/types/notification-types.js';

@Injectable()
export class FormsService {
  private readonly logger = new Logger(FormsService.name);

  constructor(
    @InjectRepository(FormEntry)
    private readonly formEntryRepository: Repository<FormEntry>,
    private readonly notificationService: NotificationService,
  ) {}

  // ─── CREATE (Public submission) ──────────────────────────────

  async create(dto: CreateFormEntryDto): Promise<FormEntry> {
    const entry = this.formEntryRepository.create(dto);
    const saved = await this.formEntryRepository.save(entry);
    this.logger.log(
      `Form entry created: type="${saved.type}" from ${saved.email}`,
    );

    // ── Send acknowledgement via unified notification service ──
    this.notificationService
      .send({
        type: NotificationType.FORM_SUBMISSION_ACKNOWLEDGEMENT,
        channels: [DeliveryChannel.EMAIL, DeliveryChannel.SMS],
        recipient: {
          email: saved.email,
          phone: saved.phone ?? undefined,
          name: saved.fullName,
        },
        context: {
          fullName: saved.fullName,
          formType: saved.type,
          data: saved.data,
          year: new Date().getFullYear(),
        },
      })
      .catch((error) => {
        this.logger.error(
          `Failed to send form acknowledgement to ${saved.email}: ${error.message}`,
        );
      });

    return saved;
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
