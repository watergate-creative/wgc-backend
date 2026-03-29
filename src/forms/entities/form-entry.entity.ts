import { BaseEntity } from '../../common/entities/base.entities.js';
import { Column, Entity } from 'typeorm';

export enum FormType {
  VOLUNTEER = 'Volunteer',
  NAMING_CEREMONY = 'Naming Ceremony',
  NEW_COMERS = 'New Comers',
  ALTAR_CALL = 'Altar Call',
  PRE_MARITAL_COUNSELLING = 'Pre-Marital Counselling',
  COUNSELLING = 'Counselling',
  FEEDBACK = 'Feedback',
  TESTIMONY = 'Testimony',
}

@Entity('FormEntries')
export class FormEntry extends BaseEntity {
  @Column({
    type: 'enum',
    enum: FormType,
    nullable: false,
  })
  type: FormType;

  @Column({ type: 'varchar', length: 300, nullable: false })
  fullName: string;

  @Column({ type: 'varchar', length: 300, nullable: false })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @Column({ type: 'jsonb', nullable: true, default: '{}' })
  data: Record<string, unknown>;
}
