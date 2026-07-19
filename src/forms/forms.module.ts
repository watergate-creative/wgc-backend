import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormEntry } from './entities/form-entry.entity.js';
import { FormsService } from './forms.service.js';
import { FormsController } from './forms.controller.js';
import { MailModule } from '../email/mail.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([FormEntry]),
    MailModule,
    NotificationsModule,
  ],
  controllers: [FormsController],
  providers: [FormsService],
  exports: [FormsService],
})
export class FormsModule {}
