import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SMS_QUEUE, SEND_SMS_JOB, SendSmsJobPayload } from './sms.constants.js';
import { TermiiService } from './termii.service.js';

@Processor(SMS_QUEUE)
export class SmsProcessor extends WorkerHost {
  private readonly logger = new Logger(SmsProcessor.name);

  constructor(private readonly termiiService: TermiiService) {
    super();
  }

  async process(job: Job<SendSmsJobPayload>): Promise<void> {
    if (job.name !== SEND_SMS_JOB) return;

    const { to, sms } = job.data;

    try {
      this.logger.debug(`Processing SMS job for ${to}`);
      await this.termiiService.sendSms({ to, sms });
      this.logger.log(`Successfully processed SMS job for ${to}`);
    } catch (error) {
      const stack = error instanceof Error ? error.stack : String(error);
      this.logger.error(`Failed to process SMS job for ${to}`, stack);
      throw error;
    }
  }
}
