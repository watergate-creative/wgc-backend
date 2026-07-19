import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entities';

@Entity('youtube_videos')
export class YoutubeVideo extends BaseEntity{
  @Column({ unique: true })
  @Index()
  videoId: string;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column()
  publishedAt: Date;

  // New Columns
  @Column()
  duration: string; // Stores YouTube's ISO 8601 duration format (e.g., PT15M33S)

  @Column()
  videoUrl: string;

  @Column()
  embedUrl: string;
  
  @Index('IDX_YOUTUBE_VIDEO_CATEGORY_GIN', { type: 'gin' })
  @Column({ type: 'jsonb', default: () => "'[]'" })
  category: string[];
}