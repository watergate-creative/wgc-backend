import { BaseEntity } from '../../common/entities/base.entities.js';
import { Column, Entity, OneToMany } from 'typeorm';
import type { FormSubmission } from './form-submission.entity.ts';

export enum FormFieldType {
  TEXT = 'text',
  EMAIL = 'email',
  PHONE = 'phone',
  TEXTAREA = 'textarea',
  SELECT = 'select',
  CHECKBOX = 'checkbox',
  DATE = 'date',
  NUMBER = 'number',
}

export interface FormFieldDefinition {
  name: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];      // For SELECT fields
  validationRegex?: string;
}

@Entity('FormTemplates')
export class FormTemplate extends BaseEntity {
  @Column({ type: 'varchar', length: 300, nullable: false })
  title: string;

  @Column({ type: 'varchar', length: 300, unique: true, nullable: false })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: false })
  fields: FormFieldDefinition[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany('FormSubmission', 'template')
  submissions: FormSubmission[];
}
