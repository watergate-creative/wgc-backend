import { BaseEntity } from '../../common/entities/base.entities.js';
import { Column, Entity, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Event } from '../../events/entities/event.entity.js';

@Entity("Participants")
@Unique(['eventId', 'email'])
export class Participant extends BaseEntity {
  @Column({ type: 'varchar', length: 300, nullable: false })
  firstName: string;

  @Column({ type: 'varchar', length: 300, nullable: false })
  lastName: string;

  @Column({ type: 'varchar', length: 300, nullable: false })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  gender: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  placeOfWorship: string;

  @Column({ type: 'boolean', default: false })
  hasAttended: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  checkInTime: Date;

  @ManyToOne(() => Event, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column({ type: 'uuid', nullable: false })
  eventId: string;
}