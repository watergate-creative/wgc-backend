import { BaseEntity } from '../../common/entities/base.entities.js';
import { Column, Entity, OneToOne, OneToMany } from 'typeorm';
import { MinisterProfile } from '../../sessions/entities/minister-profile.entity.js';
import { ActivityLog } from '../../activities/entities/activity-log.entity.js';

export enum UserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  USER = 'user',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('Users')
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 300, nullable: false })
  firstName: string;

  @Column({ type: 'varchar', length: 300, nullable: false })
  lastName: string;

  @Column({ type: 'varchar', length: 300, unique: true, nullable: false })
  email: string;

  @Column({ type: 'varchar', length: 500, nullable: false, select: false })
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ type: 'varchar', nullable: true, select: false })
  refreshToken: string | null;

  @OneToOne(() => MinisterProfile, (profile) => profile.user, { cascade: true })
  ministerProfile: MinisterProfile;

  @OneToMany(() => ActivityLog, (activity) => activity.user)
  activities: ActivityLog[];
}
