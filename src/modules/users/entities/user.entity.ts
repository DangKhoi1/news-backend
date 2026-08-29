import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../enums/user-role.enum';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';
import { Article } from '../../articles/entities/article.entity';
import { Bookmark } from '../../bookmarks/entities/bookmark.entity';
import { Comment } from '../../comments/entities/comment.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index({ unique: true }) @Column({ length: 180 }) email: string;
  @Column({ select: false }) passwordHash: string;
  @Column({ length: 120 }) displayName: string;
  @Column({ type: 'varchar', length: 2048, nullable: true })
  avatarUrl: string | null;
  @Column({ type: 'enum', enum: UserRole, default: UserRole.READER })
  role: UserRole;
  @Column({ default: true }) isActive: boolean;
  @Column({ type: 'timestamptz', nullable: true }) lastLoginAt: Date | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];
  @OneToMany(() => Article, (article) => article.author) articles: Article[];
  @OneToMany(() => Bookmark, (bookmark) => bookmark.user) bookmarks: Bookmark[];
  @OneToMany(() => Comment, (comment) => comment.user) comments: Comment[];
}
