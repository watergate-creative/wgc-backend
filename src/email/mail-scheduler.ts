import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MailService } from './mail.service';

@Injectable()
export class MailRecoveryScheduler {
  private readonly logger = new Logger(MailRecoveryScheduler.name);

  constructor(private readonly mailService: MailService) {}

  // Runs every day at midnight to retry any emails that failed permanently during the day
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleAutomaticFailedRetry() {
    this.logger.log('Running scheduled retry for failed mail jobs...');
    await this.mailService.retryAllFailedJobs();
  }
}