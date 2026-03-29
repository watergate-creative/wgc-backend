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
  CreateFormEntryDto,
  UpdateFormEntryDto,
  FormEntryQueryDto,
} from './dto/form.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Throttle } from '@nestjs/throttler';
import { ApiResponse as ApiResponseDto } from '../common/dto/api-response.dto.js';

@ApiTags('forms')
@Controller('forms')
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  // ─── PUBLIC: Submit a form entry ─────────────────────────────

  @Post()
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Submit a form entry (public, rate-limited)' })
  @ApiResponse({ status: 201, description: 'Form entry created' })
  async create(@Body() dto: CreateFormEntryDto) {
    return this.formsService.create(dto);
  }

  // ─── ADMIN: List all form entries (paginated + filtered) ─────

  @Get()
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all form entries (Admin only, filterable by type/email/name)' })
  @ApiResponse({ status: 200, description: 'Paginated list of form entries' })
  async findAll(@Query() query: FormEntryQueryDto) {
    const { data, total } = await this.formsService.findAll(query);
    return ApiResponseDto.paginated(data, total, query.page, query.limit);
  }

  // ─── ADMIN: Get a single form entry ──────────────────────────

  @Get(':id')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single form entry by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Form entry found' })
  @ApiResponse({ status: 404, description: 'Form entry not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.formsService.findOne(id);
  }

  // ─── ADMIN: Update a form entry ──────────────────────────────

  @Patch(':id')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a form entry (Admin only)' })
  @ApiResponse({ status: 200, description: 'Form entry updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFormEntryDto,
  ) {
    return this.formsService.update(id, dto);
  }

  // ─── ADMIN: Delete a form entry ──────────────────────────────

  @Delete(':id')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a form entry (Admin only)' })
  @ApiResponse({ status: 200, description: 'Form entry deleted' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.formsService.remove(id);
    return { message: 'Form entry deleted successfully' };
  }
}
