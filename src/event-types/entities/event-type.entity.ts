import { BaseEntity } from '../../common/entities/base.entities.js';
import { Column, Entity, OneToMany } from 'typeorm';
import { Event } from '../../events/entities/event.entity.js';

@Entity('event_types')
export class EventType extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @OneToMany(() => Event, (event) => event.eventType)
  events: Event[];
}
