import { Entity, Column, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entities.js';
import { User } from '../../auth/entities/user.entity.js';
import { TimeBlock } from './time-block.entity.js';
import { Session } from './session.entity.js';
import { WeeklyAvailability } from '../interfaces/availability.interface.js';

@Entity('MinisterProfiles')
export class MinisterProfile extends BaseEntity {
  @Column({ type: 'uuid', unique: true })
  userId: string;

  @OneToOne(() => User, (user) => user.ministerProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  
  @Column({ type: 'varchar', length: 200, nullable: false })
  title: string;

  @Column({ type: 'text', nullable: true, select: false })
  googleRefreshToken: string | null;

  @Column({ type: 'varchar', default: 'primary' })
  calendarId: string;

  
  @Column({ type: 'int', default: 60 })
  sessionDurationMinutes: number;

  
  @Column({ type: 'jsonb', nullable: true })
  weeklyAvailability: WeeklyAvailability | null;

  @OneToMany(() => TimeBlock, (timeBlock) => timeBlock.minister)
  timeBlocks: TimeBlock[];

  @OneToMany(() => Session, (session) => session.minister)
  sessions: Session[];
}
