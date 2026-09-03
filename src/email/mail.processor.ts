import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';
import { MAIL_QUEUE, SEND_EMAIL_JOB, MailProvider } from './mail.constants';

@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);
  private transporter: nodemailer.Transporter;
  private readonly activeProvider: MailProvider;

  private templateCache = new Map();

  constructor(private readonly configService: ConfigService) {
    super();

    this.activeProvider =
      (this.configService.get<string>('MAIL_PROVIDER')?.toLowerCase() as MailProvider) ??
      MailProvider.GMAIL;

    this.initializeTransporter();
  }

  private initializeTransporter() {
    switch (this.activeProvider) {
      case MailProvider.ZEPTOMAIL:
        this.transporter = this.createZeptoMailTransporter();
        this.logger.log('Mail transporter initialised → ZeptoMail');
        break;

      case MailProvider.GMAIL:
      default:
        this.transporter = this.createGmailTransporter();
        this.logger.log('Mail transporter initialised → Gmail');
        break;
    }
  }

  private createGmailTransporter(): nodemailer.Transporter {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.getOrThrow('GMAIL_USER'),
        pass: this.configService.getOrThrow('GMAIL_APP_PASSWORD'),
      },
    });
  }

  private createZeptoMailTransporter(): nodemailer.Transporter {
    return nodemailer.createTransport({
      host: 'smtp.zeptomail.com',
      port: 587,
      auth: {
        user: 'emailapikey',
        pass: this.configService.getOrThrow('ZEPTOMAIL_API_KEY'),
      },
    });
  }

  private getSenderAddress(): string {
    const appName = this.configService.get('APP_NAME') || 'Watergate Church Global';

    switch (this.activeProvider) {
      case MailProvider.ZEPTOMAIL:
        return `"${appName}" <${this.configService.get('ZEPTOMAIL_FROM_EMAIL', 'noreply@watergatechurch.org')}>`;

      case MailProvider.GMAIL:
      default:
        return `"${appName}" <${this.configService.get('GMAIL_USER')}>`;
    }
  }

  private async getCompiledTemplate(templateName: string): Promise<handlebars.TemplateDelegate>  {

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
    const from = this.getSenderAddress();

    try {

      const compiledTemplate = await this.getCompiledTemplate(template);

      const html = compiledTemplate(context);

      this.logger.debug(`Sending email to ${to} via ${this.activeProvider}...`);

      await this.transporter.sendMail({ from, to, subject, html });
      this.logger.log(`Email successfully sent to ${to} via ${this.activeProvider}`);
    } catch (error) {
        
      const stack = error instanceof Error ? error.stack : String(error);
      this.logger.error(`Failed to send email to ${to} via ${this.activeProvider}`, stack);
      throw error;
    }
  }
}