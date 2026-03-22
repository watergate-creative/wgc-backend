import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Query,
  UseGuards,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ParticipantService } from './participant.service.js';
import {
  RegisterParticipantDto,
  BulkRegistrationDto,
  ParticipantQueryDto,
} from './dto/participant.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Throttle } from '@nestjs/throttler';

@ApiTags('event-participants')
@Controller()
export class ParticipantController {
  constructor(private readonly participantService: ParticipantService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('events/:eventId/participants/register')
  @ApiOperation({ summary: 'Register for an event natively' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  async register(
    @Param('eventId') eventId: string,
    @Body() dto: RegisterParticipantDto,
  ) {
    return this.participantService.register(eventId, dto);
  }

  @ApiBearerAuth()
  @Roles('admin', 'editor')
  @Post('events/participants/bulk-register')
  @ApiOperation({ summary: 'Register a participant for multiple events at once' })
  async registerBulk(@Body() dto: BulkRegistrationDto) {
    return this.participantService.registerBulk(dto);
  }

  @ApiBearerAuth()
  @Roles('admin', 'editor', 'user')
  @Patch('events/:eventId/participants/:id/check-in')
  @ApiOperation({ summary: 'Check in a participant at the venue' })
  @ApiParam({ name: 'eventId', description: 'ID of the event' })
  @ApiParam({ name: 'id', description: 'ID of the participant registration' })
  async checkIn(
    @Param('eventId') eventId: string,
    @Param('id') participantId: string,
  ) {
    return this.participantService.checkIn(eventId, participantId);
  }

  @ApiBearerAuth()
  @Roles('admin', 'editor', 'user')
  @Get('events/:eventId/participants')
  @ApiOperation({ summary: 'Get all participants for a specific event' })
  async getEventParticipants(
    @Param('eventId') eventId: string,
    @Query() query: ParticipantQueryDto,
  ) {
    return this.participantService.getParticipantsForEvent(eventId, query);
  }

  @Public()
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Get('participants/lookup')
  @ApiOperation({ summary: 'Look up all events a specific email is registered for' })
  @ApiResponse({ status: 200, description: 'List of registrations returned' })
  async lookupRegistrations(
    @Query('email') email: string,
    @Query() query: ParticipantQueryDto,
  ) {
    return this.participantService.getRegistrationsByEmail(email, query);
  }

  @ApiBearerAuth()
  @Roles('admin', 'editor')
  @Delete('events/:eventId/participants/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a participant registration' })
  async removeRegistration(
    @Param('eventId') eventId: string,
    @Param('id') id: string,
  ) {
    await this.participantService.removeRegistration(eventId, id);
  }
}
