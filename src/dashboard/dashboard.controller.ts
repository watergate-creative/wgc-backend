import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'Get aggregated dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Returns current stats from Redis (Cache-Aside)' })
  async getStats() {
    return this.dashboardService.getStats();
  }

  @Post('stats/sync')
  @Roles('admin')
  @ApiOperation({ summary: 'Re-synchronize dashboard statistics with database' })
  @ApiResponse({ status: 200, description: 'Stats re-synchronized successfully' })
  async syncStats() {
    return this.dashboardService.syncStats();
  }
}
