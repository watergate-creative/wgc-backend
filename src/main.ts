import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const logger = new Logger('Bootstrap');

  app.enableShutdownHooks();

  app.use(helmet());
  app.enableCors({

    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('WaterGate Church API')
    .setDescription(
      'Production-grade backend API for WaterGate Church — events, registration, file uploads, and more.\n\n🔗 [**View OpenAPI JSON Specification**](/api/v1/docs-json)',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT access token',
      },
      'bearer',
    )
    .addTag('health', 'Application health check')
    .addTag('auth', 'Authentication, authorization & user management')
    .addTag('events', 'Church events management')
    .addTag('event-participants', 'Event registration & check-in (open to public)')
    .addTag('uploads', 'File upload via Cloudinary')
    .addTag('forms', 'Dynamic form builder & submissions')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document);

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  logger.log(`🚀 Application running on http://localhost:${port}`);
  logger.log(`📖 Swagger docs: http://localhost:${port}/api/v1/docs`);
}
bootstrap();
