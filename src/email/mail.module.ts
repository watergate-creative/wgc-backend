import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { MailProcessor } from './mail.processor';
import { MAIL_QUEUE, MailProvider } from './mail.constants';
import { MailQueueController } from './mail.controller';
import { MAIL_PROVIDER_STRATEGY } from './providers/mail-provider.interface';
import { ZeptomailStrategy } from './providers/zeptomail.strategy';
import { GmailStrategy } from './providers/gmail.strategy';

@Module({
  imports: [
    BullModule.registerQueue({
      name: MAIL_QUEUE,
    }),
  ],
  controllers: [MailQueueController],
  providers: [
    MailService,
    MailProcessor,
    ZeptomailStrategy,
    GmailStrategy,
    {
      provide: MAIL_PROVIDER_STRATEGY,
      useFactory: (
        configService: ConfigService,
        zeptoMailStrategy: ZeptomailStrategy,
        gmailStrategy: GmailStrategy,
      ) => {
        const provider = configService.get<string>('MAIL_PROVIDER')?.toLowerCase();
        
        switch (provider) {
          case MailProvider.ZEPTOMAIL:
            if (!zeptoMailStrategy.isAvailable()) {
              throw new Error('ZeptoMail is selected but SMTP_HOST is not configured in your environment variables.');
            }
            return zeptoMailStrategy;
          case MailProvider.GMAIL:
            return gmailStrategy;
          default:
            // Default to Zeptomail if available, otherwise Gmail
            return zeptoMailStrategy.isAvailable() ? zeptoMailStrategy : gmailStrategy;
        }
      },
      inject: [ConfigService, ZeptomailStrategy, GmailStrategy],
    },
  ],
  exports: [MailService],
})
export class MailModule {}