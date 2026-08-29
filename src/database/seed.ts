import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import slugify from 'slugify';
import { Repository } from 'typeorm';
import { AppModule } from '../app.module';
import { Category } from '../modules/categories/entities/category.entity';
import { Source } from '../modules/sources/entities/source.entity';
import { Tag } from '../modules/tags/entities/tag.entity';
import { User } from '../modules/users/entities/user.entity';
import { UserRole } from '../modules/users/enums/user-role.enum';

const categoryNames = [
  'Thời sự',
  'Kinh tế',
  'Công nghệ',
  'Đời sống',
  'Thể thao',
  'Giải trí',
];
const tagNames = ['Chính sách mới', 'Thị trường', 'AI', 'Thời tiết', 'Bóng đá'];

async function seed(): Promise<void> {
  let app: Awaited<
    ReturnType<typeof NestFactory.createApplicationContext>
  > | null = null;
  try {
    app = await NestFactory.createApplicationContext(AppModule);
    const config = app.get(ConfigService);
    const users = app.get<Repository<User>>(getRepositoryToken(User));
    const categories = app.get<Repository<Category>>(
      getRepositoryToken(Category),
    );
    const tags = app.get<Repository<Tag>>(getRepositoryToken(Tag));
    const sources = app.get<Repository<Source>>(getRepositoryToken(Source));
    for (const [index, name] of categoryNames.entries()) {
      const slug = slugify(name, { lower: true, strict: true, locale: 'vi' });
      if (!(await categories.exists({ where: { slug } }))) {
        await categories.save(
          categories.create({
            name,
            slug,
            sortOrder: index + 1,
            isActive: true,
          }),
        );
      }
    }
    for (const name of tagNames) {
      const slug = slugify(name, { lower: true, strict: true, locale: 'vi' });
      if (!(await tags.exists({ where: { slug } })))
        await tags.save(tags.create({ name, slug }));
    }
    if (!(await sources.exists({ where: { slug: 'nhip-tin' } }))) {
      await sources.save(
        sources.create({
          name: 'Nhịp Tin',
          slug: 'nhip-tin',
          websiteUrl: 'http://localhost:3000',
          logoUrl: null,
          isVerified: true,
          isActive: true,
        }),
      );
    }
    const email = config
      .get<string>('ADMIN_EMAIL', 'admin@nhiptin.vn')
      .toLowerCase();
    if (!(await users.exists({ where: { email } }))) {
      await users.save(
        users.create({
          email,
          displayName: config.get<string>('ADMIN_NAME', 'Quản trị Nhịp Tin'),
          passwordHash: await bcrypt.hash(
            config.get<string>('ADMIN_PASSWORD', 'Admin@123456'),
            12,
          ),
          role: UserRole.ADMIN,
          isActive: true,
        }),
      );
    }
    console.log(
      'Seed dữ liệu nền thành công. Chạy npm run news:sync để lấy tin thật.',
    );
  } catch (error: unknown) {
    console.error(
      'Seed thất bại:',
      error instanceof Error ? error.message : String(error),
    );
    process.exitCode = 1;
  } finally {
    if (app) await app.close();
  }
}

void seed();
