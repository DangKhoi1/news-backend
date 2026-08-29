import {
  Column,
  Entity,
  Index,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Article } from '../../articles/entities/article.entity';
@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 80 }) name: string;
  @Index({ unique: true }) @Column({ length: 100 }) slug: string;
  @ManyToMany(() => Article, (article) => article.tags) articles: Article[];
}
