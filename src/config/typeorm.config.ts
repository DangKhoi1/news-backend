import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
const asBoolean = (value: string | undefined, fallback: boolean): boolean => {
  try {
    return value === undefined
      ? fallback
      : value.trim().toLowerCase() === 'true';
  } catch {
    return fallback;
  }
};
export function getTypeOrmConfig(config: ConfigService): TypeOrmModuleOptions {
  try {
    return {
      type: 'postgres',
      host: config.getOrThrow<string>('DB_HOST'),
      port: config.get<number>('DB_PORT', 5432),
      username: config.getOrThrow<string>('DB_USERNAME'),
      password: config.getOrThrow<string>('DB_PASSWORD'),
      database: config.getOrThrow<string>('DB_DATABASE'),
      autoLoadEntities: true,
      synchronize: asBoolean(
        config.get<string>('DB_SYNCHRONIZE'),
        config.get<string>('NODE_ENV') !== 'production',
      ),
      logging: asBoolean(config.get<string>('DB_LOGGING'), false),
      ssl:
        config.get<string>('NODE_ENV') === 'production'
          ? { rejectUnauthorized: false }
          : false,
    };
  } catch (error: unknown) {
    throw error instanceof Error ? error : new Error(String(error));
  }
}
