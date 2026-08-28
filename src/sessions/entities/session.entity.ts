import { Entity, Column, ManyToOne, JoinColumn, Index, Check } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entities.js';
import { MinisterProfile } from './minister-profile.entity.js';

export enum SessionStatus {
  SCHEDULED = 'SCHEDULED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

@Entity('Sessions')
@Index(['ministerId', 'startTime', 'endTime'])
@Index(['ministerId', 'status'])
@Index(['guestEmail'])
@Check(`"endTime" > "startTime"`)
export class Session extends BaseEntity {
  @Column({ type: 'uuid' })
  ministerId: string;

  @ManyToOne(() => MinisterProfile, (minister) => minister.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ministerId' })
  minister: MinisterProfile;

  @Column({ type: 'varchar', length: 300, nullable: false })
  guestName: string;

  @Column({ type: 'varchar', length: 300, nullable: false })
  guestEmail: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  guestPhone: string;

  @Column({ type: 'timestamptz', nullable: false })
  startTime: Date;

  @Column({ type: 'timestamptz', nullable: false })
  endTime: Date;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.SCHEDULED,
  })
  status: SessionStatus;

  @Column({ type: 'text', nullable: true })
  purpose: string;
}
