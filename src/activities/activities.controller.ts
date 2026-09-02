import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service.js';
import { ActivityQueryDto } from './dto/activities.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ApiResponse } from '../common/dto/api-response.dto.js';

@ApiTags('Activities')
@Controller('activities')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all activity logs (Admin only)' })
  async getActivities(@Query() query: ActivityQueryDto) {
    const { data, total } = await this.activitiesService.getActivities(query);
    return ApiResponse.paginated(data, total, query.page, query.limit);
  }
}
