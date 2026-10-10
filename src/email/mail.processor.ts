import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import * as handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';
import { MAIL_QUEUE, SEND_EMAIL_JOB } from './mail.constants';
import { MAIL_PROVIDER_STRATEGY } from './providers/mail-provider.interface';
import type { IMailProviderStrategy } from './providers/mail-provider.interface';

@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);
  private templateCache = new Map();

  constructor(
    @Inject(MAIL_PROVIDER_STRATEGY)
    private readonly mailStrategy: IMailProviderStrategy
  ) {
    super();
    this.logger.log(`Mail processor initialised → ${this.mailStrategy.name}`);
    this.registerHelpers();
  }

  private registerHelpers() {
    handlebars.registerHelper('formatDate', (dateString: string) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      // E.g. "December 23, 2026"
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    });

    handlebars.registerHelper('formatGuid', (guid: string) => {
      if (!guid) return '';
      // Extracts first part of the UUID and converts to uppercase, e.g. "F2B866FC"
      return guid.split('-')[0].toUpperCase();
    });
  }

  private async getCompiledTemplate(templateName: string): Promise<handlebars.TemplateDelegate> {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    const templatePath = path.join(__dirname, 'templates', `${templateName}.hbs`);

    try {
      const templateSource = await fs.readFile(templatePath, 'utf-8');
      const compiled = handlebars.compile(templateSource);

      this.templateCache.set(templateName, compiled);
      return compiled;
    } catch (error) {
      const stack = error instanceof Error ? error.stack : String(error);
      this.logger.error(`Failed to load template file: ${templatePath}`, stack);
      throw error;
    }
  }

  async process(job: Job): Promise<void> {
    if (job.name !== SEND_EMAIL_JOB) return;

    const { to, subject, template, context } = job.data;
    const from = this.mailStrategy.getSenderAddress();

    try {
      const compiledTemplate = await this.getCompiledTemplate(template);
      const html = compiledTemplate(context);

      this.logger.debug(`Sending email to ${to} via ${this.mailStrategy.name}...`);

      await this.mailStrategy.sendMail({ from, to, subject, html });
      this.logger.log(`Email successfully sent to ${to} via ${this.mailStrategy.name}`);
    } catch (error) {
      const stack = error instanceof Error ? error.stack : String(error);
      this.logger.error(`Failed to send email to ${to} via ${this.mailStrategy.name}`, stack);
      throw error;
    }
  }
}