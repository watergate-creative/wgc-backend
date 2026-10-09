import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import 'multer';
import { randomBytes } from 'crypto';
import { extname } from 'path';
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
  title: string;
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

  constructor(private readonly cloudinaryProvider: CloudinaryProvider) { }

  async uploadImage(
    file: Express.Multer.File,
    folder = 'wgc',
  ): Promise<UploadResult> {
    this.validateFile(file);

    const title = this.generateTitle(file.originalname);

    try {
      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = this.cloudinaryProvider
          .getCloudinary()
          .uploader.upload_stream(
            {
              folder,
              public_id: title,
              context: { title },
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
        title,
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

  async listImages(folder = 'wgc', maxResults = 50): Promise<any[]> {
    try {
      let searchApi = this.cloudinaryProvider
        .getCloudinary()
        .search.max_results(maxResults)
        .with_field('context');
      if (folder) {
        searchApi = searchApi.expression(`folder:${folder}*`);
      }
      const result = await searchApi.execute();
      return result.resources.map((res: any) => ({
        title: this.extractTitle(res),
        url: res.url,
        secureUrl: res.secure_url,
        publicId: res.public_id,
        format: res.format,
        width: res.width,
        height: res.height,
        bytes: res.bytes,
        createdAt: res.created_at,
      }));
    } catch (error) {
      this.logger.error(`Cloudinary list images failed: ${(error as Error).message}`);
      throw new InternalServerErrorException('Failed to list images');
    }
  }

  async getImage(publicId: string): Promise<any> {
    try {
      const result = await this.cloudinaryProvider.getCloudinary().api.resource(publicId);
      return {
        title: this.extractTitle(result),
        url: result.url,
        secureUrl: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        createdAt: result.created_at,
      };
    } catch (error) {
      this.logger.error(`Cloudinary get image failed: ${(error as Error).message}`);
      throw new NotFoundException(`Image with publicId ${publicId} not found`);
    }
  }

  /**
   * Builds a unique, URL-safe title from the original file name.
   * e.g. "My Photo (1).PNG" -> "my-photo-1-1759869790123-a1b2c3"
   */
  private generateTitle(originalName: string): string {
    const baseName = (originalName || 'image').replace(extname(originalName || ''), '');
    const slug =
      baseName
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'image';
    const suffix = `${Date.now()}-${randomBytes(3).toString('hex')}`;
    return `${slug}-${suffix}`;
  }

  /** Reads the stored title from Cloudinary context, falling back to the public ID. */
  private extractTitle(resource: any): string {
    return (
      resource?.context?.custom?.title ??
      resource?.context?.title ??
      String(resource?.public_id ?? '').split('/').pop() ??
      ''
    );
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
