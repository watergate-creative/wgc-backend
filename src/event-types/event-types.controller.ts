import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { EventTypesService } from './event-types.service.js';
import { CreateEventTypeDto, UpdateEventTypeDto } from './dto/event-type.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('event-types')
@Controller('event-types')
export class EventTypesController {
  constructor(private readonly eventTypesService: EventTypesService) {}

  @Post()
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new event type (Admin only)' })
  @ApiResponse({ status: 201, description: 'Event type successfully created.' })
  create(@Body() createEventTypeDto: CreateEventTypeDto) {
    return this.eventTypesService.create(createEventTypeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all event types' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean, description: 'Filter by active status' })
  findAll(@Query('activeOnly') activeOnly?: string) {
    const isActiveOnly = activeOnly === 'true';
    return this.eventTypesService.findAll(isActiveOnly);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific event type by ID' })
  findOne(@Param('id') id: string) {
    return this.eventTypesService.findOne(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get a specific event type by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.eventTypesService.findBySlug(slug);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an event type (Admin only)' })
  update(@Param('id') id: string, @Body() updateEventTypeDto: UpdateEventTypeDto) {
    return this.eventTypesService.update(id, updateEventTypeDto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an event type (Admin only)' })
  remove(@Param('id') id: string) {
    return this.eventTypesService.remove(id);
  }
}
