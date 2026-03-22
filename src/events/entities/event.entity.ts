import { BaseEntity } from '../../common/entities/base.entities.js';
import { Column, Entity, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { Minister } from '../../ministers/entities/minister.entity.js';
import { Participant } from '../../participant/entities/participant.entity.js';

export enum EventType {
  SUNDAY_SERVICE = 'sunday_service',
  BIBLE_STUDY = 'bible_study',
  SPECIAL_PROGRAM = 'special_program',
  CONCERT = 'concert',
  CONFERENCE = 'conference',
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
    default: EventType.SUNDAY_SERVICE,
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

  @Column({ type: 'varchar', length: 100, nullable: true })
  startTime: string;

  @Column({ type: 'varchar', length: 500, nullable: false })
  location: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  bannerImageUrl: string;

  @Column({ type: 'int', nullable: true })
  capacity: number;

  @Column({ type: 'boolean', default: true })
  isFree: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  price: number;

  @Column({ type: 'boolean', default: true })
  isRegistrationRequired: boolean;

  @Column({
    type: 'enum',
    enum: EventStatus,
    default: EventStatus.DRAFT,
  })
  status: EventStatus;

  @Column({ type: 'boolean', default: true })
  isPublic: boolean;

  @ManyToMany(() => Minister, (minister) => minister.events, { cascade: false })
  @JoinTable({
    name: 'event_ministers',
    joinColumn: {
      name: 'eventId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'ministerId',
      referencedColumnName: 'id',
    },
  })
  ministers: Minister[];

  @OneToMany(() => Participant, (participant) => participant.event)
  participants: Participant[];

  @Column({ type: 'int', default: 0 })
  registrationCount: number;
}
