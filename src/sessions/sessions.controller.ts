import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Res,
  Req,
  Patch,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import * as express from 'express';
import { SessionsService } from './sessions.service.js';
import { GoogleCalendarService } from './google-calendar.service.js';
import {
  BookSessionDto,
  CreateMinisterProfileDto,
  CreateTimeBlockDto,
  UpdateWeeklyAvailabilityDto,
} from './dto/sessions.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';

@ApiTags('sessions')
@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  // ─── GOOGLE OAUTH FOR MINISTERS ─────────────────────────────────

  @Get('auth/google')
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate Google Calendar OAuth flow' })
  @ApiResponse({ status: 302, description: 'Redirects to Google consent screen' })
  googleAuth(@Req() req: any, @Res() res: express.Response) {
    const userId = req.user.id;
    const url = this.googleCalendarService.generateAuthUrl(userId);
    res.redirect(url);
  }

  @Get('auth/google/callback')
  @Public()
  @ApiOperation({ summary: 'Google OAuth callback — exchanges code for refresh token' })
  @ApiResponse({ status: 200, description: 'Calendar linked successfully' })
  @ApiResponse({ status: 400, description: 'Failed to link calendar' })
  async googleAuthCallback(
    @Query('code') code: string,
    @Query('state') userId: string,
    @Res() res: express.Response,
  ) {
    try {
      const refreshToken = await this.googleCalendarService.getRefreshToken(code);
      await this.sessionsService.saveGoogleRefreshToken(userId, refreshToken);
      res.send('Google Calendar linked successfully! You can close this window.');
    } catch (error) {
      res.status(400).send(`Error linking Google Calendar: ${(error as Error).message}`);
    }
  }

  // ─── MINISTER PROFILE ──────────────────────────────────────────

  @Post('profile')
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a minister profile for the logged-in user' })
  @ApiResponse({ status: 201, description: 'Profile created' })
  @ApiResponse({ status: 409, description: 'Profile already exists' })
  async createProfile(@Req() req: any, @Body() dto: CreateMinisterProfileDto) {
    return this.sessionsService.createProfile(req.user.id, dto);
  }

  @Get('profile')
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the logged-in minister\'s profile' })
  @ApiResponse({ status: 200, description: 'Minister profile' })
  @ApiResponse({ status: 404, description: 'No profile found' })
  async getProfile(@Req() req: any) {
    return this.sessionsService.getProfile(req.user.id);
  }

  @Patch('availability')
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update weekly availability hours' })
  @ApiResponse({ status: 200, description: 'Availability updated' })
  async updateAvailability(
    @Req() req: any,
    @Body() dto: UpdateWeeklyAvailabilityDto,
  ) {
    return this.sessionsService.updateWeeklyAvailability(
      req.user.id,
      dto.weeklyAvailability,
    );
  }

  // ─── TIME BLOCKS ────────────────────────────────────────────────

  @Post('blocks')
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually block a time slot' })
  @ApiResponse({ status: 201, description: 'Time block created' })
  @ApiResponse({ status: 409, description: 'Overlaps with an existing block' })
  async createTimeBlock(@Req() req: any, @Body() dto: CreateTimeBlockDto) {
    return this.sessionsService.createTimeBlock(req.user.id, dto);
  }

  @Get('blocks')
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all manually blocked time slots' })
  @ApiResponse({ status: 200, description: 'List of time blocks' })
  async getTimeBlocks(@Req() req: any) {
    return this.sessionsService.getTimeBlocks(req.user.id);
  }

  @Delete('blocks/:id')
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a manual time block' })
  @ApiResponse({ status: 200, description: 'Block removed' })
  @ApiResponse({ status: 404, description: 'Block not found' })
  async deleteTimeBlock(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) blockId: string,
  ) {
    await this.sessionsService.deleteTimeBlock(req.user.id, blockId);
    return { message: 'Time block removed successfully' };
  }

  // ─── MINISTER SESSIONS ─────────────────────────────────────────

  @Get('my-sessions')
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all sessions for the logged-in minister' })
  @ApiResponse({ status: 200, description: 'List of sessions' })
  async getMinisterSessions(@Req() req: any) {
    return this.sessionsService.getMinisterSessions(req.user.id);
  }

  @Patch('my-sessions/:id/cancel')
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a scheduled session' })
  @ApiResponse({ status: 200, description: 'Session cancelled' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async cancelSession(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) sessionId: string,
  ) {
    return this.sessionsService.cancelSession(req.user.id, sessionId);
  }

  // ─── PUBLIC BOOKING ENDPOINTS ───────────────────────────────────

  @Get('ministers')
  @Public()
  @ApiOperation({ summary: 'List all ministers available for booking' })
  @ApiResponse({ status: 200, description: 'List of ministers' })
  async getMinisters() {
    return this.sessionsService.getAllMinisters();
  }

  @Get('ministers/:id/availability')
  @Public()
  @ApiOperation({ summary: 'Get computed available time slots for a minister' })
  @ApiResponse({ status: 200, description: 'Available time slots' })
  @ApiResponse({ status: 404, description: 'Minister not found' })
  async getAvailability(
    @Param('id', ParseUUIDPipe) ministerId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.sessionsService.getAvailability(ministerId, startDate, endDate);
  }

  @Post('ministers/:id/book')
  @Public()
  @ApiOperation({ summary: 'Book a session with a minister' })
  @ApiResponse({ status: 201, description: 'Session booked' })
  @ApiResponse({ status: 404, description: 'Minister not found' })
  @ApiResponse({ status: 409, description: 'Time slot conflict' })
  async bookSession(
    @Param('id', ParseUUIDPipe) ministerId: string,
    @Body() dto: BookSessionDto,
  ) {
    return this.sessionsService.bookSession(ministerId, dto);
  }
}
