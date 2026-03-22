import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse as SwaggerResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ChangePasswordDto,
  UpdateUserRoleDto,
  UserQueryDto,
} from './dto/auth.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Throttle } from '@nestjs/throttler';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── PUBLIC AUTH ──────────────────────────────────────────────

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Register a new user account' })
  @SwaggerResponse({ status: 201, description: 'User registered successfully' })
  @SwaggerResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with email and password' })
  @SwaggerResponse({ status: 200, description: 'Login successful' })
  @SwaggerResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @SwaggerResponse({ status: 200, description: 'Tokens refreshed' })
  @SwaggerResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshTokens(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @SwaggerResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@CurrentUser('id') userId: string) {
    await this.authService.logout(userId);
    return { message: 'Logged out successfully' };
  }

  // ─── USER PROFILE ────────────────────────────────────────────

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @SwaggerResponse({ status: 200, description: 'Current user profile' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Patch('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change your password' })
  @SwaggerResponse({ status: 200, description: 'Password changed' })
  @SwaggerResponse({ status: 400, description: 'Current password incorrect' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto);
  }

  // ─── ADMIN: USER MANAGEMENT ──────────────────────────────────

  @Get('users')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all users (Admin only)' })
  @SwaggerResponse({ status: 200, description: 'Paginated list of users' })
  async getAllUsers(@Query() query: UserQueryDto) {
    return this.authService.getAllUsers(query);
  }

  @Patch('users/:id/role')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change a user\'s role (Admin only)' })
  @SwaggerResponse({ status: 200, description: 'Role updated' })
  @SwaggerResponse({ status: 400, description: 'Cannot change own role' })
  async updateUserRole(
    @CurrentUser('id') adminId: string,
    @Param('id', ParseUUIDPipe) targetUserId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.authService.updateUserRole(adminId, targetUserId, dto);
  }

  @Patch('users/:id/deactivate')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate a user account (Admin only)' })
  @SwaggerResponse({ status: 200, description: 'User deactivated' })
  async deactivateUser(
    @CurrentUser('id') adminId: string,
    @Param('id', ParseUUIDPipe) targetUserId: string,
  ) {
    return this.authService.deactivateUser(adminId, targetUserId);
  }

  @Patch('users/:id/activate')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate a user account (Admin only)' })
  @SwaggerResponse({ status: 200, description: 'User activated' })
  async activateUser(
    @CurrentUser('id') adminId: string,
    @Param('id', ParseUUIDPipe) targetUserId: string,
  ) {
    return this.authService.activateUser(adminId, targetUserId);
  }
}
