import { Entity, Column, ManyToOne, JoinColumn, Index, Check } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entities.js';
import { MinisterProfile } from './minister-profile.entity.js';

@Entity('TimeBlocks')
@Index(['ministerId', 'startTime', 'endTime'])
@Check(`"endTime" > "startTime"`)
export class TimeBlock extends BaseEntity {
  @Column({ type: 'uuid' })
  ministerId: string;

  @ManyToOne(() => MinisterProfile, (minister) => minister.timeBlocks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ministerId' })
  minister: MinisterProfile;

  @Column({ type: 'timestamptz', nullable: false })
  startTime: Date;

  @Column({ type: 'timestamptz', nullable: false })
  endTime: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason: string;
}
