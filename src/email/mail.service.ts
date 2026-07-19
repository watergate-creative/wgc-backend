import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface EventEmailDetails {
  firstName: string;
  eventTitle: string;
  startDate: Date;
  endDate: Date;
  dailySchedule?: string;
  location: string;
  address?: string;
}

// import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MAIL_QUEUE, SEND_EMAIL_JOB, SendEmailJobPayload } from './mail.constants.js';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
  ) {}

  /**
   * Pushes an email to the background queue for asynchronous processing.
   */
  async queueEmail(payload: SendEmailJobPayload): Promise<void> {
    try {
      // Add job to queue with retry logic
      await this.mailQueue.add(SEND_EMAIL_JOB, payload, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        // Retain failed jobs for up to 7 days or a max of 1000 jobs so you can retry them later
        removeOnFail: {
          age: 7 * 24 * 3600, // 7 days in seconds
          count: 1000,
        },
      });
      this.logger.log(`Queued email for ${payload.to}`);
    } catch (error) {
      const stack = error instanceof Error ? error.stack : String(error);
      this.logger.error(`Failed to queue email for ${payload.to}`, stack);
      throw error;
    }
  }

  async retryFailedJobById(jobId: string): Promise<void> {
    const job = await this.mailQueue.getJob(jobId);
    
    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found in queue.`);
    }

    const state = await job.getState();
    if (state !== 'failed') {
      this.logger.warn(`Job ${jobId} is currently in state "${state}", not "failed". Skipping retry.`);
      return;
    }

    await job.retry();
    this.logger.log(`Successfully requeued failed job ${jobId} for retry.`);
  }

  async retryAllFailedJobs(): Promise<{ retriedCount: number }> {
    const failedJobs = await this.mailQueue.getFailed();
    let retriedCount = 0;

    this.logger.log(`Found ${failedJobs.length} failed jobs. Attempting to requeue...`);

    for (const job of failedJobs) {
      try {
        await job.retry();
        retriedCount++;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Could not retry job ${job.id}: ${msg}`);
      }
    }

    this.logger.log(`Successfully requeued ${retriedCount} out of ${failedJobs.length} failed jobs.`);
    return { retriedCount };
  }
}
