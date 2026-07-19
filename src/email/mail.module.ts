import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { MailProcessor } from './mail.processor';
import { MAIL_QUEUE } from './mail.constants';
import { MailQueueController } from './mail.controller';

@Module({
  imports: [
    // Register the specific queue for emails
    BullModule.registerQueue({
      name: MAIL_QUEUE,
    }),
  ],
  controllers:[MailQueueController],
  providers: [MailService, MailProcessor],
  exports: [MailService],
})
export class MailModule {}