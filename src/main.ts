import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap(): Promise<void> {
  try {
    const app = await NestFactory.create(AppModule);
    const config = app.get(ConfigService);
    app.use(helmet());
    app.use(cookieParser());
    app.enableCors({
      origin: config
        .get<string>('FRONTEND_URL', 'http://localhost:3000')
        .split(',')
        .map((item) => item.trim()),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: false },
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Nhịp Tin API')
      .setDescription('API cho trang tổng hợp tin tức Việt Nam và thế giới')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup(
      'api/docs',
      app,
      SwaggerModule.createDocument(app, swaggerConfig),
      { swaggerOptions: { persistAuthorization: true } },
    );
    const port = config.get<number>('PORT', 8081);
    await app.listen(port, '0.0.0.0');
    Logger.log(
      `Nhịp Tin API chạy tại http://localhost:${port}/api/v1`,
      'Bootstrap',
    );
  } catch (error: unknown) {
    Logger.error(
      error instanceof Error ? error.stack : String(error),
      'Bootstrap',
    );
    process.exitCode = 1;
  }
}
void bootstrap();
