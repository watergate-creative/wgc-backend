import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormTemplate, FormFieldType } from './entities/form-template.entity.js';
import { FormSubmission } from './entities/form-submission.entity.js';
import {
  CreateFormTemplateDto,
  UpdateFormTemplateDto,
  SubmitFormDto,
  FormQueryDto,
  SubmissionQueryDto,
} from './dto/form.dto.js';

@Injectable()
export class FormsService implements OnModuleInit {
  private readonly logger = new Logger(FormsService.name);

  constructor(
    @InjectRepository(FormTemplate)
    private readonly templateRepository: Repository<FormTemplate>,
    @InjectRepository(FormSubmission)
    private readonly submissionRepository: Repository<FormSubmission>,
  ) {}

  // ─── LIFECYCLE: SEED TEMPLATES ON BOOT ───────────────────────

  async onModuleInit(): Promise<void> {
    const count = await this.templateRepository.count();
    if (count === 0) {
      this.logger.log('No form templates found. Seeding default templates...');
      await this.seedDefaults();
    }
  }

  // ─── TEMPLATE CRUD ───────────────────────────────────────────

  async createTemplate(dto: CreateFormTemplateDto): Promise<FormTemplate> {
    const slug = this.generateSlug(dto.title);

    const existing = await this.templateRepository.findOne({ where: { slug } });
    if (existing) {
      throw new BadRequestException(`A form with a similar name already exists`);
    }

    const template = this.templateRepository.create({
      ...dto,
      slug,
      fields: dto.fields as any,
    });

    const saved = await this.templateRepository.save(template);
    this.logger.log(`Form template created: "${saved.title}" (${saved.slug})`);
    return saved;
  }

  async findAllTemplates(
    query: FormQueryDto,
  ): Promise<{ data: FormTemplate[]; total: number }> {
    const qb = this.templateRepository.createQueryBuilder('template');

    if (query.isActive !== undefined) {
      qb.andWhere('template.isActive = :isActive', {
        isActive: query.isActive,
      });
    }

    if (query.search) {
      qb.andWhere('LOWER(template.title) LIKE LOWER(:search)', {
        search: `%${query.search}%`,
      });
    }

    qb.loadRelationCountAndMap('template.submissionCount', 'template.submissions')
      .orderBy('template.createdAt', 'DESC')
      .skip(query.skip)
      .take(query.limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findTemplateById(id: string): Promise<FormTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
    });
    if (!template) {
      throw new NotFoundException('Form template not found');
    }
    return template;
  }

  async findTemplateBySlug(slug: string): Promise<FormTemplate> {
    const template = await this.templateRepository.findOne({
      where: { slug, isActive: true },
    });
    if (!template) {
      throw new NotFoundException(`Form "${slug}" not found or is not active`);
    }
    return template;
  }

  async updateTemplate(
    id: string,
    dto: UpdateFormTemplateDto,
  ): Promise<FormTemplate> {
    const template = await this.findTemplateById(id);

    if (dto.title && dto.title !== template.title) {
      (template as any).slug = this.generateSlug(dto.title);
    }

    Object.assign(template, dto);
    const updated = await this.templateRepository.save(template);
    this.logger.log(`Form template updated: "${updated.title}"`);
    return updated;
  }

  async removeTemplate(id: string): Promise<void> {
    const template = await this.findTemplateById(id);
    await this.templateRepository.softRemove(template);
    this.logger.log(`Form template soft-deleted: ${id}`);
  }

  // ─── FORM SUBMISSION ─────────────────────────────────────────

  async submitForm(
    slug: string,
    dto: SubmitFormDto,
  ): Promise<FormSubmission> {
    const template = await this.findTemplateBySlug(slug);

    // Validate submission data against field definitions
    this.validateSubmission(template, dto.data);

    const submission = this.submissionRepository.create({
      templateId: template.id,
      data: dto.data,
      submitterName: dto.submitterName,
      submitterEmail: dto.submitterEmail,
      submitterPhone: dto.submitterPhone,
    });

    const saved = await this.submissionRepository.save(submission);
    this.logger.log(
      `Form submission received for "${template.title}" from ${dto.submitterEmail || dto.submitterName || 'anonymous'}`,
    );
    return saved;
  }

  async getSubmissions(
    templateId: string,
    query: SubmissionQueryDto,
  ): Promise<{ data: FormSubmission[]; total: number }> {
    await this.findTemplateById(templateId); // Ensure template exists

    const qb = this.submissionRepository
      .createQueryBuilder('submission')
      .where('submission.templateId = :templateId', { templateId });

    if (query.email) {
      qb.andWhere('submission.submitterEmail = :email', {
        email: query.email,
      });
    }

    if (query.search) {
      qb.andWhere('LOWER(submission.submitterName) LIKE LOWER(:search)', {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy('submission.createdAt', 'DESC')
      .skip(query.skip)
      .take(query.limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async getSubmissionById(id: string): Promise<FormSubmission> {
    const submission = await this.submissionRepository.findOne({
      where: { id },
      relations: ['template'],
    });
    if (!submission) {
      throw new NotFoundException('Submission not found');
    }
    return submission;
  }

  // ─── VALIDATION ──────────────────────────────────────────────

  private validateSubmission(
    template: FormTemplate,
    data: Record<string, unknown>,
  ): void {
    const errors: string[] = [];

    for (const field of template.fields) {
      const value = data[field.name];

      // Check required fields
      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push(`"${field.label}" is required`);
        continue;
      }

      if (value === undefined || value === null || value === '') {
        continue; // Optional field with no value — skip
      }

      // Type-specific validation
      switch (field.type) {
        case FormFieldType.EMAIL:
          if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors.push(`"${field.label}" must be a valid email address`);
          }
          break;

        case FormFieldType.NUMBER:
          if (typeof value !== 'number' && isNaN(Number(value))) {
            errors.push(`"${field.label}" must be a number`);
          }
          break;

        case FormFieldType.CHECKBOX:
          if (typeof value !== 'boolean') {
            errors.push(`"${field.label}" must be true or false`);
          }
          break;

        case FormFieldType.SELECT:
          if (field.options && !field.options.includes(String(value))) {
            errors.push(
              `"${field.label}" must be one of: ${field.options.join(', ')}`,
            );
          }
          break;

        case FormFieldType.DATE:
          if (typeof value === 'string' && isNaN(Date.parse(value))) {
            errors.push(`"${field.label}" must be a valid date`);
          }
          break;
      }

      // Custom regex validation
      if (field.validationRegex && typeof value === 'string') {
        const regex = new RegExp(field.validationRegex);
        if (!regex.test(value)) {
          errors.push(`"${field.label}" format is invalid`);
        }
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }
  }

  // ─── SEED DEFAULTS ───────────────────────────────────────────

  private async seedDefaults(): Promise<void> {
    const defaults: Partial<FormTemplate>[] = [
      {
        title: 'Volunteer Form',
        slug: 'volunteer-form',
        description: 'Sign up to volunteer at WaterGate Church',
        isActive: true,
        fields: [
          { name: 'fullName', label: 'Full Name', type: FormFieldType.TEXT, required: true, placeholder: 'Enter your full name' },
          { name: 'email', label: 'Email Address', type: FormFieldType.EMAIL, required: true, placeholder: 'your@email.com' },
          { name: 'phone', label: 'Phone Number', type: FormFieldType.PHONE, required: true, placeholder: '08012345678' },
          { name: 'department', label: 'Preferred Department', type: FormFieldType.SELECT, required: true, options: ['Ushering', 'Choir', 'Media', 'Children', 'Technical', 'Protocol', 'Sanitation', 'Prayer', 'Other'] },
          { name: 'experience', label: 'Related Experience', type: FormFieldType.TEXTAREA, required: false, placeholder: 'Tell us about any relevant experience' },
          { name: 'availability', label: 'Availability', type: FormFieldType.SELECT, required: true, options: ['Sundays Only', 'Weekdays Only', 'Both', 'Flexible'] },
        ],
      },
      {
        title: 'Baby Dedication',
        slug: 'baby-dedication',
        description: 'Register your child for baby dedication',
        isActive: true,
        fields: [
          { name: 'parentName', label: "Parent / Guardian's Full Name", type: FormFieldType.TEXT, required: true },
          { name: 'parentPhone', label: "Parent's Phone Number", type: FormFieldType.PHONE, required: true },
          { name: 'parentEmail', label: "Parent's Email", type: FormFieldType.EMAIL, required: false },
          { name: 'babyName', label: "Baby's Full Name", type: FormFieldType.TEXT, required: true },
          { name: 'babyDob', label: "Baby's Date of Birth", type: FormFieldType.DATE, required: true },
          { name: 'babyGender', label: "Baby's Gender", type: FormFieldType.SELECT, required: true, options: ['Male', 'Female'] },
          { name: 'dedicationDate', label: 'Preferred Dedication Date', type: FormFieldType.DATE, required: false },
        ],
      },
      {
        title: 'New Members',
        slug: 'new-members',
        description: 'Welcome to WaterGate Church! Tell us about yourself',
        isActive: true,
        fields: [
          { name: 'fullName', label: 'Full Name', type: FormFieldType.TEXT, required: true },
          { name: 'email', label: 'Email Address', type: FormFieldType.EMAIL, required: true },
          { name: 'phone', label: 'Phone Number', type: FormFieldType.PHONE, required: true },
          { name: 'gender', label: 'Gender', type: FormFieldType.SELECT, required: true, options: ['Male', 'Female'] },
          { name: 'address', label: 'Home Address', type: FormFieldType.TEXTAREA, required: false, placeholder: 'Enter your address' },
          { name: 'dob', label: 'Date of Birth', type: FormFieldType.DATE, required: false },
          { name: 'howDidYouHear', label: 'How did you hear about us?', type: FormFieldType.SELECT, required: false, options: ['Social Media', 'A Friend/Family', 'Walk-in', 'Online Search', 'Flyer/Poster', 'Other'] },
          { name: 'previousChurch', label: 'Previous Place of Worship', type: FormFieldType.TEXT, required: false },
        ],
      },
      {
        title: 'Altar Call',
        slug: 'altar-call',
        description: 'Record your decision at the altar call',
        isActive: true,
        fields: [
          { name: 'fullName', label: 'Full Name', type: FormFieldType.TEXT, required: true },
          { name: 'phone', label: 'Phone Number', type: FormFieldType.PHONE, required: true },
          { name: 'email', label: 'Email Address', type: FormFieldType.EMAIL, required: false },
          { name: 'decisionType', label: 'Decision', type: FormFieldType.SELECT, required: true, options: ['Salvation', 'Rededication', 'Water Baptism', 'Holy Spirit Baptism', 'Other'] },
          { name: 'prayerRequest', label: 'Prayer Request', type: FormFieldType.TEXTAREA, required: false, placeholder: 'Share your prayer request if any' },
        ],
      },
      {
        title: 'Pre-Marital Counselling',
        slug: 'pre-marital-counselling',
        description: 'Register for pre-marital counselling at WaterGate Church',
        isActive: true,
        fields: [
          { name: 'groomName', label: "Groom's Full Name", type: FormFieldType.TEXT, required: true },
          { name: 'brideName', label: "Bride's Full Name", type: FormFieldType.TEXT, required: true },
          { name: 'groomPhone', label: "Groom's Phone Number", type: FormFieldType.PHONE, required: true },
          { name: 'bridePhone', label: "Bride's Phone Number", type: FormFieldType.PHONE, required: true },
          { name: 'email', label: 'Contact Email', type: FormFieldType.EMAIL, required: true },
          { name: 'proposedDate', label: 'Proposed Wedding Date', type: FormFieldType.DATE, required: true },
          { name: 'notes', label: 'Additional Notes', type: FormFieldType.TEXTAREA, required: false },
        ],
      },
      {
        title: 'Counselling',
        slug: 'counselling',
        description: 'Request a counselling session',
        isActive: true,
        fields: [
          { name: 'fullName', label: 'Full Name', type: FormFieldType.TEXT, required: true },
          { name: 'phone', label: 'Phone Number', type: FormFieldType.PHONE, required: true },
          { name: 'email', label: 'Email Address', type: FormFieldType.EMAIL, required: false },
          { name: 'counsellingType', label: 'Type of Counselling', type: FormFieldType.SELECT, required: true, options: ['Spiritual', 'Marriage', 'Family', 'Career', 'Emotional', 'Other'] },
          { name: 'preferredDay', label: 'Preferred Day', type: FormFieldType.SELECT, required: false, options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] },
          { name: 'briefDescription', label: 'Brief Description', type: FormFieldType.TEXTAREA, required: true, placeholder: 'Briefly describe why you need counselling' },
          { name: 'isConfidential', label: 'Keep this strictly confidential', type: FormFieldType.CHECKBOX, required: false },
        ],
      },
      {
        title: 'Feedback Form',
        slug: 'feedback-form',
        description: 'Share your feedback about our services and events',
        isActive: true,
        fields: [
          { name: 'fullName', label: 'Full Name (optional)', type: FormFieldType.TEXT, required: false },
          { name: 'email', label: 'Email (optional)', type: FormFieldType.EMAIL, required: false },
          { name: 'rating', label: 'How would you rate your experience?', type: FormFieldType.SELECT, required: true, options: ['Excellent', 'Very Good', 'Good', 'Fair', 'Poor'] },
          { name: 'whatDidYouEnjoy', label: 'What did you enjoy most?', type: FormFieldType.TEXTAREA, required: false },
          { name: 'improvements', label: 'What can we improve?', type: FormFieldType.TEXTAREA, required: false },
          { name: 'additionalComments', label: 'Additional Comments', type: FormFieldType.TEXTAREA, required: false },
        ],
      },
      {
        title: 'Testimony',
        slug: 'testimony',
        description: 'Share your testimony with the church',
        isActive: true,
        fields: [
          { name: 'fullName', label: 'Full Name', type: FormFieldType.TEXT, required: true },
          { name: 'phone', label: 'Phone Number', type: FormFieldType.PHONE, required: false },
          { name: 'testimonyText', label: 'Your Testimony', type: FormFieldType.TEXTAREA, required: true, placeholder: 'Share what God has done for you...' },
          { name: 'canSharePublicly', label: 'Can we share this testimony publicly?', type: FormFieldType.CHECKBOX, required: false },
          { name: 'testimonyDate', label: 'When did this happen?', type: FormFieldType.DATE, required: false },
        ],
      },
    ];

    for (const tmpl of defaults) {
      const template = this.templateRepository.create(tmpl);
      await this.templateRepository.save(template);
    }

    this.logger.log(`Seeded ${defaults.length} default form templates`);
  }

  // ─── HELPERS ─────────────────────────────────────────────────

  private generateSlug(title: string): string {
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const uniqueSuffix = Date.now().toString(36);
    return `${baseSlug}-${uniqueSuffix}`;
  }
}
