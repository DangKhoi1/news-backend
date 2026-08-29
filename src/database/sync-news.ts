import { NestFactory } from '@nestjs/core';
import { IngestionService } from '../modules/ingestion/ingestion.service';

async function syncNews(): Promise<void> {
  let app: Awaited<
    ReturnType<typeof NestFactory.createApplicationContext>
  > | null = null;
  try {
    process.env.NEWS_SYNC_ON_START = 'false';
    const { AppModule } = await import('../app.module');
    app = await NestFactory.createApplicationContext(AppModule);
    const ingestion = app.get(IngestionService);
    const result = await ingestion.syncAll('cli');
    console.log(JSON.stringify(result, null, 2));
    if (result.imported === 0 && result.failed > 0) process.exitCode = 1;
  } catch (error: unknown) {
    console.error(
      'Đồng bộ tin thất bại:',
      error instanceof Error ? error.message : String(error),
    );
    process.exitCode = 1;
  } finally {
    if (app) await app.close();
  }
}

void syncNews();
