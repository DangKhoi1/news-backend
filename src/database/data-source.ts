import 'dotenv/config';
import { DataSource } from 'typeorm';

function createDataSource(): DataSource {
  try {
    return new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5433),
      username: process.env.DB_USERNAME ?? 'news_user',
      password: process.env.DB_PASSWORD ?? 'news_password',
      database: process.env.DB_DATABASE ?? 'news_db',
      entities: [`${__dirname}/../modules/**/*.entity{.ts,.js}`],
      migrations: [`${__dirname}/migrations/*{.ts,.js}`],
      synchronize: false,
      logging: process.env.DB_LOGGING === 'true',
    });
  } catch (error: unknown) {
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export default createDataSource();
