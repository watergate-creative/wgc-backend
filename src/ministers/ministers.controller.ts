import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MinistersService } from './ministers.service.js';
import { CreateMinisterDto, UpdateMinisterDto, MinisterQueryDto } from './dto/minister.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';

@ApiTags('ministers')
@Controller('ministers')
export class MinistersController {
  constructor(private readonly ministersService: MinistersService) {}

  @ApiBearerAuth()
  @Roles('admin', 'editor')
  @Post()
  @ApiOperation({ summary: 'Create a new minister' })
  @ApiResponse({ status: 201, description: 'Minister created' })
  async create(@Body() createMinisterDto: CreateMinisterDto) {
    return this.ministersService.create(createMinisterDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all ministers' })
  async findAll(@Query() query: MinisterQueryDto) {
    return this.ministersService.findAll(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific minister' })
  async findOne(@Param('id') id: string) {
    return this.ministersService.findOne(id);
  }

  @ApiBearerAuth()
  @Roles('admin', 'editor')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a minister' })
  async update(@Param('id') id: string, @Body() updateMinisterDto: UpdateMinisterDto) {
    return this.ministersService.update(id, updateMinisterDto);
  }

  @ApiBearerAuth()
  @Roles('admin')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a minister' })
  async remove(@Param('id') id: string) {
    return this.ministersService.remove(id);
  }
}
