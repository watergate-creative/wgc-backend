import { Controller, Post, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { MailService } from './mail.service';
import { Public } from '../common';

@Controller('admin/mail-queue')
export class MailQueueController {
  constructor(private readonly mailService: MailService) {}
  @Post('retry/:jobId')
  @HttpCode(HttpStatus.OK)
  async retrySingleJob(@Param('jobId') jobId: string) {
    await this.mailService.retryFailedJobById(jobId);
    return { message: `Job ${jobId} sent back to queue for retry.` };
  }
  @Public()
  @Post('retry-all')
  @HttpCode(HttpStatus.OK)
  async retryAllJobs() {
    return await this.mailService.retryAllFailedJobs();
  }
}