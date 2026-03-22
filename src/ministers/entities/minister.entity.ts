import { BaseEntity } from '../../common/entities/base.entities.js';
import { Column, Entity, ManyToMany } from 'typeorm';
import { Event } from '../../events/entities/event.entity.js';

@Entity('Ministers')
export class Minister extends BaseEntity {
  @Column({ type: 'varchar', length: 300, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl: string;

  @Column({ type: 'varchar', length: 100, nullable: true, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @ManyToMany(() => Event, (event) => event.ministers)
  events: Event[];
}
