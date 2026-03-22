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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EventsService } from './events.service.js';
import { CreateEventDto, UpdateEventDto, EventQueryDto } from './dto/event.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ApiResponse as ApiResponseDto } from '../common/dto/api-response.dto.js';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new event (Admin/Editor only)' })
  @ApiResponse({ status: 201, description: 'Event created' })
  async create(@Body() dto: CreateEventDto) {
    return this.eventsService.create(dto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all events with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of events' })
  async findAll(@Query() query: EventQueryDto) {
    const { data, total } = await this.eventsService.findAll(query);
    return ApiResponseDto.paginated(data, total, query.page, query.limit);
  }

  @Get('upcoming')
  @Public()
  @ApiOperation({ summary: 'Get upcoming published events' })
  @ApiResponse({ status: 200, description: 'List of upcoming events' })
  async findUpcoming(@Query('limit') limit?: number) {
    return this.eventsService.findUpcoming(limit);
  }

  @Get('slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Get event by slug' })
  @ApiResponse({ status: 200, description: 'Event found' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async findBySlug(@Param('slug') slug: string) {
    return this.eventsService.findBySlug(slug);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiResponse({ status: 200, description: 'Event found' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an event (Admin/Editor only)' })
  @ApiResponse({ status: 200, description: 'Event updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an event (Admin only)' })
  @ApiResponse({ status: 200, description: 'Event deleted' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.eventsService.remove(id);
    return { message: 'Event deleted successfully' };
  }
}
