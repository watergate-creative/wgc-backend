import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';
import { MAIL_QUEUE, SEND_EMAIL_JOB } from './mail.constants';

@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);
  private transporter: nodemailer.Transporter;
  
  // Cache to store compiled templates in memory
  private templateCache = new Map();

  constructor(private readonly configService: ConfigService) {
    super();
    this.initializeTransporter();
  }

  private initializeTransporter() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.getOrThrow('GMAIL_USER'),
        pass: this.configService.getOrThrow('GMAIL_APP_PASSWORD'),
      },
    });
  }

  private async getCompiledTemplate(templateName: string): Promise<handlebars.TemplateDelegate>  {
    // Return cached version if it exists
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    // Resolve the path dynamically relative to the current file (__dirname)
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
    const from = `"${this.configService.get('APP_NAME') || 'My App'}" <${this.configService.get('GMAIL_USER')}>`;

    try {
      // 1. Get and compile the template
      const compiledTemplate = await this.getCompiledTemplate(template);
      
      // 2. Inject context to generate final HTML
      const html = compiledTemplate(context);

      this.logger.debug(`Sending email to ${to}...`);
      
      // 3. Send via Nodemailer
      await this.transporter.sendMail({ from, to, subject, html });
      this.logger.log(`Email successfully sent to ${to}`);
    } catch (error) {
        
      const stack = error instanceof Error ? error.stack : String(error);
      this.logger.error(`Failed to send email to ${to}`, stack);
      throw error;
    }
  }
}