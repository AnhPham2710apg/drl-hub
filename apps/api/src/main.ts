import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('DRL-Hub API Documentation')
    .setDescription('Tài liệu API DRL-Hub: Ingestion Pipeline, DRL Simulator, Authentication & RBAC')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`\n======================================================`);
  console.log(`🚀 DRL-Hub Web UI is running on:     http://localhost:${port}`);
  console.log(`📑 Swagger Interactive API Docs:    http://localhost:${port}/docs`);
  console.log(`======================================================\n`);
}
bootstrap();
