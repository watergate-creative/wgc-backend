import { BaseEntity } from '../../common/entities/base.entities.js';
import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { FormTemplate } from './form-template.entity.js';

@Entity('FormSubmissions')
export class FormSubmission extends BaseEntity {
  @ManyToOne(() => FormTemplate, (template) => template.submissions, {
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'templateId' })
  template: FormTemplate;

  @Column({ type: 'uuid', nullable: false })
  templateId: string;

  @Column({ type: 'jsonb', nullable: false })
  data: Record<string, unknown>;

  @Column({ type: 'varchar', length: 300, nullable: true })
  submitterName: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  submitterEmail: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  submitterPhone: string;
}
