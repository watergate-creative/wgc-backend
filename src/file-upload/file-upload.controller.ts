import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import 'multer';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from './file-upload.service.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@ApiTags('uploads')
@Controller('uploads')
@ApiBearerAuth()
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) { }

  @Post('image')
  @Roles('admin', 'editor')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload an image to Cloudinary (Admin/Editor)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, GIF, WebP, SVG). Max 5MB.',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Image uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    return this.fileUploadService.uploadImage(file);
  }

  @Delete(':publicId')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete an image from Cloudinary (Admin only)' })
  @ApiResponse({ status: 200, description: 'Image deleted' })
  async deleteImage(@Param('publicId') publicId: string) {
    await this.fileUploadService.deleteImage(publicId);
    return { message: 'Image deleted successfully' };
  }

  @Get()
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'List images from Cloudinary (Admin/Editor)' })
  @ApiResponse({ status: 200, description: 'Returns a list of images' })
  async listImages(
    @Query('folder') folder?: string,
    @Query('maxResults') maxResults?: number,
  ) {
    return this.fileUploadService.listImages(folder, maxResults);
  }

  @Get(':publicId')
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'Get a single image from Cloudinary (Admin/Editor)' })
  @ApiResponse({ status: 200, description: 'Returns image details' })
  @ApiResponse({ status: 404, description: 'Image not found' })
  async getImage(@Param('publicId') publicId: string) {
    return this.fileUploadService.getImage(publicId);
  }
}
