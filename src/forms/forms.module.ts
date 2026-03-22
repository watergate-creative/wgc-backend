import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormTemplate } from './entities/form-template.entity.js';
import { FormSubmission } from './entities/form-submission.entity.js';
import { FormsService } from './forms.service.js';
import { FormsController } from './forms.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([FormTemplate, FormSubmission])],
  controllers: [FormsController],
  providers: [FormsService],
  exports: [FormsService],
})
export class FormsModule {}
