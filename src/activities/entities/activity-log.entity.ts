import { BaseEntity } from '../../common/entities/base.entities.js';
import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity.js';
import { Participant } from '../../participant/entities/participant.entity.js';

export enum ActivityAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  ROLE_UPDATE = 'ROLE_UPDATE',
  STATUS_UPDATE = 'STATUS_UPDATE',
  REGISTER_USER = 'REGISTER_USER',
  REGISTER_EVENT = 'REGISTER_EVENT',
  CHECK_IN_EVENT = 'CHECK_IN_EVENT',
}

@Entity('ActivityLogs')
export class ActivityLog extends BaseEntity {
  @Column({
    type: 'enum',
    enum: ActivityAction,
  })
  action: ActivityAction;

  @Column({ type: 'text', nullable: true })
  details: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ipAddress: string;

  @ManyToOne(() => User, (user) => user.activities, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @ManyToOne(() => Participant, (participant) => participant.activities, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participantId' })
  participant: Participant;

  @Column({ type: 'uuid', nullable: true })
  participantId: string;
}
