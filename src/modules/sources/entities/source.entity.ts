import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Article } from '../../articles/entities/article.entity';
@Entity('sources')
export class Source {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 120 }) name: string;
  @Index({ unique: true }) @Column({ length: 140 }) slug: string;
  @Column({ type: 'varchar', length: 2048, nullable: true })
  websiteUrl: string | null;
  @Column({ type: 'varchar', length: 2048, nullable: true })
  logoUrl: string | null;
  @Column({ default: true }) isVerified: boolean;
  @Column({ default: true }) isActive: boolean;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
  @OneToMany(() => Article, (article) => article.source) articles: Article[];
}
