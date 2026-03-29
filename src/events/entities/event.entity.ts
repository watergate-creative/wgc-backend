import { BaseEntity } from '../../common/entities/base.entities.js';
import { Column, Entity, OneToMany } from 'typeorm';
import { Participant } from '../../participant/entities/participant.entity.js';

export enum EventType {
  SEERS_AND_SCRIBES = 'SEERS AND SCRIBES BOOTCAMP',
  KDG = 'KINGDOM DIPLOMAT GATHERING',
  FOCP = 'FEAST OF CHOICE PIECES',
  KACS = 'KINGDOM ADVANCEMENT CITY SUMMIT',
  ETHANIM = 'ETHANIM',
  TYRANUS = 'TYRANUS RETREAT',
  CRYSTAL_WATERS = 'CRYSTAL WATERS',
  HUNDREDFOLD_SUMMIT = 'HUNDREDFOLD SUMMIT',
  TRANSFORMATION_SERVICE = 'TRANSFORMATION SERVICE',
  HARP_AND_BOWL = 'HARP AND BOWL',
}

export enum EventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

@Entity('Events')
export class Event extends BaseEntity {
  @Column({
    type: 'enum',
    enum: EventType,
    default: EventType.TRANSFORMATION_SERVICE,
  })
  type: EventType;
  @Column({ type: 'varchar', length: 500, nullable: false })
  title: string;

  @Column({ type: 'varchar', length: 500, unique: true, nullable: false })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'timestamptz', nullable: false })
  startDate: Date;

  @Column({ type: 'timestamptz', nullable: false })
  endDate: Date;

  @Column({ type: 'text', nullable: true })
  dailySchedule: string;

  @Column({ type: 'varchar', length: 500, nullable: false })
  location: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  bannerImageUrl: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  price: number;

  @Column({
    type: 'enum',
    enum: EventStatus,
    default: EventStatus.DRAFT,
  })
  status: EventStatus;

  @OneToMany(() => Participant, (participant) => participant.event)
  participants: Participant[];

  @Column({ type: 'int', default: 0 })
  registrationCount: number;
}
