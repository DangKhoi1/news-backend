import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ArticleRegion } from '../../articles/enums/article-region.enum';

@Entity('news_feeds')
export class NewsFeed {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 140 }) name: string;
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 2048 })
  url: string;
  @Column({ length: 120 }) sourceName: string;
  @Column({ length: 140 }) sourceSlug: string;
  @Column({ type: 'varchar', length: 2048 }) websiteUrl: string;
  @Column({ length: 120 }) categorySlug: string;
  @Column({ type: 'enum', enum: ArticleRegion }) region: ArticleRegion;
  @Column({ default: true }) isActive: boolean;
  @Column({ type: 'timestamptz', nullable: true }) lastSyncedAt: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) lastSuccessAt: Date | null;
  @Column({ type: 'text', nullable: true }) lastError: string | null;
  @Column({ default: 0 }) lastImportedCount: number;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
}
