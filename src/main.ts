import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { firebaseConfig } from 'firebase-config';
import { initializeApp } from 'firebase/app';
import { ValidationPipe } from '@nestjs/common';

var cors = require('cors');
dotenv.config();

async function bootstrap() {
  /// admin initialization
  admin.initializeApp({
    credential: admin.credential.cert({
      privateKey: process.env.private_key,
      projectId: process.env.project_id,
      clientEmail: process.env.client_email,
    }),
  });

  //// should npm i firebase/app
  /// client initialization
  initializeApp(firebaseConfig);

  const app = await NestFactory.create(AppModule);

  const corsOptions: CorsOptions = {
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  };

  app.enableCors(corsOptions);
  app.use(bodyParser.json({ limit: '700kb' }));
  app.setGlobalPrefix('web');
  app.useGlobalPipes(
    new ValidationPipe({
      // whitelist: true,
      // forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.listen(8003);
}
export default admin;
bootstrap();
