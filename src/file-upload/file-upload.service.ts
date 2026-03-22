import {
  Injectable,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { CloudinaryProvider } from './cloudinary.provider.js';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface UploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);

  constructor(private readonly cloudinaryProvider: CloudinaryProvider) {}

  async uploadImage(
    file: Express.Multer.File,
    folder = 'wgc',
  ): Promise<UploadResult> {
    this.validateFile(file);

    try {
      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = this.cloudinaryProvider
          .getCloudinary()
          .uploader.upload_stream(
            {
              folder,
              resource_type: 'image',
              transformation: [
                { quality: 'auto', fetch_format: 'auto' },
              ],
            },
            (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            },
          );

        uploadStream.end(file.buffer);
      });

      this.logger.log(
        `Image uploaded to Cloudinary: ${result.public_id} (${result.bytes} bytes)`,
      );

      return {
        url: result.url,
        secureUrl: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
      };
    } catch (error) {
      this.logger.error(`Cloudinary upload failed: ${(error as Error).message}`);
      throw new InternalServerErrorException('Failed to upload image. Please try again.');
    }
  }

  async deleteImage(publicId: string): Promise<void> {
    try {
      await this.cloudinaryProvider
        .getCloudinary()
        .uploader.destroy(publicId);
      this.logger.log(`Image deleted from Cloudinary: ${publicId}`);
    } catch (error) {
      this.logger.error(`Cloudinary delete failed: ${(error as Error).message}`);
      throw new InternalServerErrorException('Failed to delete image');
    }
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }
  }
}
