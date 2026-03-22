import { Module } from '@nestjs/common';
import { CloudinaryProvider } from './cloudinary.provider.js';
import { FileUploadService } from './file-upload.service.js';
import { FileUploadController } from './file-upload.controller.js';

@Module({
  controllers: [FileUploadController],
  providers: [CloudinaryProvider, FileUploadService],
  exports: [FileUploadService],
})
export class FileUploadModule {}
