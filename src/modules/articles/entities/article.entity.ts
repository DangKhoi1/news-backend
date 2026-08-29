import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Category } from '../../categories/entities/category.entity';
import { Tag } from '../../tags/entities/tag.entity';
import { Source } from '../../sources/entities/source.entity';
import { Bookmark } from '../../bookmarks/entities/bookmark.entity';
import { Comment } from '../../comments/entities/comment.entity';
import { ArticleStatus } from '../enums/article-status.enum';
import { ArticleRegion } from '../enums/article-region.enum';

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 240 }) title: string;
  @Index({ unique: true }) @Column({ length: 260 }) slug: string;
  @Column({ type: 'text' }) summary: string;
  @Column({ type: 'text' }) content: string;
  @Column({ type: 'varchar', length: 2048, nullable: true })
  thumbnailUrl: string | null;
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 2048, nullable: true })
  originalUrl: string | null;
  @Column({ type: 'enum', enum: ArticleRegion, default: ArticleRegion.VIETNAM })
  region: ArticleRegion;
  @Column({ type: 'enum', enum: ArticleStatus, default: ArticleStatus.DRAFT })
  status: ArticleStatus;
  @Column({ default: false }) isFeatured: boolean;
  @Column({ default: false }) isBreaking: boolean;
  @Column({ default: true }) allowComments: boolean;
  @Column({ default: 1 }) readingTimeMinutes: number;
  @Column({ type: 'bigint', default: 0 }) viewCount: string;
  @Column({ type: 'timestamptz', nullable: true }) publishedAt: Date | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;

  @Column({ type: 'uuid' }) categoryId: string;
  @ManyToOne(() => Category, (category) => category.articles, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'categoryId' })
  category: Category;
  @Column({ type: 'uuid', nullable: true }) sourceId: string | null;
  @ManyToOne(() => Source, (source) => source.articles, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'sourceId' })
  source: Source | null;
  @Column({ type: 'uuid' }) authorId: string;
  @ManyToOne(() => User, (user) => user.articles, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'authorId' })
  author: User;
  @ManyToMany(() => Tag, (tag) => tag.articles)
  @JoinTable({ name: 'article_tags' })
  tags: Tag[];
  @OneToMany(() => Bookmark, (bookmark) => bookmark.article)
  bookmarks: Bookmark[];
  @OneToMany(() => Comment, (comment) => comment.article) comments: Comment[];
}
