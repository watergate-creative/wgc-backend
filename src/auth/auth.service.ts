import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity.js';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ChangePasswordDto,
  UpdateUserRoleDto,
  UserQueryDto,
  AuthResponseDto,
} from './dto/auth.dto.js';
import { EmailService } from '../email/email.service.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtRefreshSecret: string;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {
    this.jwtRefreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'wgc-refresh-secret-change-me',
    );
  }

  // ─── PUBLIC AUTH ──────────────────────────────────────────────

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const email = registerDto.email.toLowerCase().trim();

    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    const user = this.userRepository.create({
      firstName: registerDto.firstName.trim(),
      lastName: registerDto.lastName.trim(),
      email,
      password: hashedPassword,
      role: UserRole.USER, // Always USER — no role escalation
    });

    const savedUser = await this.userRepository.save(user);
    this.logger.log(`User registered: ${savedUser.email}`);

    // Fire-and-forget welcome email
    this.emailService
      .sendWelcomeEmail(savedUser.email, savedUser.firstName)
      .catch((e) => this.logger.error(`Welcome email failed: ${e.message}`));

    const tokens = await this.generateTokens(savedUser);
    await this.updateRefreshToken(savedUser.id, tokens.refreshToken);

    return this.buildAuthResponse(savedUser, tokens);
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email.toLowerCase().trim() },
      select: [
        'id',
        'email',
        'password',
        'firstName',
        'lastName',
        'role',
        'isActive',
      ],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new ForbiddenException(
        'Account is deactivated. Contact an administrator.',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`User logged in: ${user.email}`);

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return this.buildAuthResponse(user, tokens);
  }

  /**
   * FIXED: No longer scans all users. 
   * Decodes the refresh JWT to extract userId, fetches only that user,
   * then bcrypt-compares the stored hashed refresh token.
   */
  async refreshTokens(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthResponseDto> {
    let payload: { sub: string };

    try {
      payload = this.jwtService.verify(refreshTokenDto.refreshToken, {
        secret: this.jwtRefreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'role',
        'isActive',
        'refreshToken',
      ],
    });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is deactivated');
    }

    const isRefreshValid = await bcrypt.compare(
      refreshTokenDto.refreshToken,
      user.refreshToken,
    );
    if (!isRefreshValid) {
      // Possible token reuse attack — invalidate all sessions
      await this.userRepository.update(user.id, { refreshToken: null });
      throw new UnauthorizedException(
        'Refresh token has been revoked. Please login again.',
      );
    }

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return this.buildAuthResponse(user, tokens);
  }

  async logout(userId: string): Promise<void> {
    await this.userRepository.update(userId, { refreshToken: null });
    this.logger.log(`User logged out: ${userId}`);
  }

  // ─── USER PROFILE ────────────────────────────────────────────

  async getProfile(
    userId: string,
  ): Promise<Omit<User, 'password' | 'refreshToken'>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'password'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isOldPasswordValid = await bcrypt.compare(
      dto.oldPassword,
      user.password,
    );
    if (!isOldPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedNewPassword = await bcrypt.hash(dto.newPassword, 12);
    await this.userRepository.update(userId, {
      password: hashedNewPassword,
      refreshToken: null, // Force re-login on all devices
    });

    this.logger.log(`User ${userId} changed their password`);
    return { message: 'Password changed successfully. Please login again.' };
  }

  // ─── ADMIN: USER MANAGEMENT ──────────────────────────────────

  async getAllUsers(
    query: UserQueryDto,
  ): Promise<{ data: User[]; total: number }> {
    const qb = this.userRepository.createQueryBuilder('user');

    if (query.search) {
      qb.andWhere(
        '(LOWER(user.firstName) LIKE LOWER(:search) OR LOWER(user.lastName) LIKE LOWER(:search) OR LOWER(user.email) LIKE LOWER(:search))',
        { search: `%${query.search}%` },
      );
    }

    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }

    if (query.isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive: query.isActive });
    }

    qb.orderBy('user.createdAt', 'DESC')
      .skip(query.skip)
      .take(query.limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async updateUserRole(
    adminId: string,
    targetUserId: string,
    dto: UpdateUserRoleDto,
  ): Promise<User> {
    if (adminId === targetUserId) {
      throw new BadRequestException('You cannot change your own role');
    }

    const user = await this.userRepository.findOne({
      where: { id: targetUserId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.role = dto.role;
    const updated = await this.userRepository.save(user);
    this.logger.log(
      `Admin ${adminId} changed role of user ${targetUserId} to ${dto.role}`,
    );
    return updated;
  }

  async deactivateUser(
    adminId: string,
    targetUserId: string,
  ): Promise<{ message: string }> {
    if (adminId === targetUserId) {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    const user = await this.userRepository.findOne({
      where: { id: targetUserId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = false;
    user.refreshToken = null; // Force logout
    await this.userRepository.save(user);
    this.logger.log(`Admin ${adminId} deactivated user ${targetUserId}`);
    return { message: 'User deactivated successfully' };
  }

  async activateUser(
    adminId: string,
    targetUserId: string,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: targetUserId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = true;
    await this.userRepository.save(user);
    this.logger.log(`Admin ${adminId} activated user ${targetUserId}`);
    return { message: 'User activated successfully' };
  }

  // ─── PRIVATE HELPERS ─────────────────────────────────────────

  private async generateTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get(
          'JWT_SECRET',
          'wgc-default-secret-change-me',
        ),
        expiresIn: this.configService.get('JWT_EXPIRATION', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.jwtRefreshSecret,
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 12);
    await this.userRepository.update(userId, {
      refreshToken: hashedRefreshToken,
    });
  }

  private buildAuthResponse(
    user: User,
    tokens: { accessToken: string; refreshToken: string },
  ): AuthResponseDto {
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }
}
