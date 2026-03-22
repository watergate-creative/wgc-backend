import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { FormsService } from './forms.service.js';
import {
  CreateFormTemplateDto,
  UpdateFormTemplateDto,
  SubmitFormDto,
  FormQueryDto,
  SubmissionQueryDto,
} from './dto/form.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Throttle } from '@nestjs/throttler';
import { ApiResponse as ApiResponseDto } from '../common/dto/api-response.dto.js';

@ApiTags('forms')
@Controller('forms')
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  // ─── TEMPLATE MANAGEMENT (Admin) ─────────────────────────────

  @Post('templates')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new form template (Admin only)' })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createTemplate(@Body() dto: CreateFormTemplateDto) {
    return this.formsService.createTemplate(dto);
  }

  @Get('templates')
  @Public()
  @ApiOperation({ summary: 'List all form templates' })
  @ApiResponse({ status: 200, description: 'Paginated list of form templates' })
  async findAllTemplates(@Query() query: FormQueryDto) {
    const { data, total } = await this.formsService.findAllTemplates(query);
    return ApiResponseDto.paginated(data, total, query.page, query.limit);
  }

  @Get('templates/:slug')
  @Public()
  @ApiOperation({ summary: 'Get form template by slug (for rendering)' })
  @ApiResponse({ status: 200, description: 'Template found' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async findTemplateBySlug(@Param('slug') slug: string) {
    return this.formsService.findTemplateBySlug(slug);
  }

  @Patch('templates/:id')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a form template (Admin only)' })
  @ApiResponse({ status: 200, description: 'Template updated' })
  async updateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFormTemplateDto,
  ) {
    return this.formsService.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a form template (Admin only)' })
  @ApiResponse({ status: 200, description: 'Template deleted' })
  async removeTemplate(@Param('id', ParseUUIDPipe) id: string) {
    await this.formsService.removeTemplate(id);
    return { message: 'Form template deleted successfully' };
  }

  // ─── PUBLIC SUBMISSION ───────────────────────────────────────

  @Post('templates/:slug/submit')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Submit a form (public, rate-limited)' })
  @ApiResponse({ status: 201, description: 'Form submitted' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async submitForm(
    @Param('slug') slug: string,
    @Body() dto: SubmitFormDto,
  ) {
    return this.formsService.submitForm(slug, dto);
  }

  // ─── SUBMISSION QUERIES (Admin) ──────────────────────────────

  @Get('templates/:id/submissions')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List submissions for a form template (Admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated list of submissions' })
  async getSubmissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: SubmissionQueryDto,
  ) {
    const { data, total } = await this.formsService.getSubmissions(id, query);
    return ApiResponseDto.paginated(data, total, query.page, query.limit);
  }

  @Get('submissions/:id')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single submission detail (Admin only)' })
  @ApiResponse({ status: 200, description: 'Submission found' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  async getSubmissionById(@Param('id', ParseUUIDPipe) id: string) {
    return this.formsService.getSubmissionById(id);
  }
}
