import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { firebaseConfig } from 'fireabase-config';
import * as bodyParser from 'body-parser';
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

var cors = require('cors');
dotenv.config();

async function bootstrap() {
  /// admin initialization

  console.log('process.env.private_key', process.env.private_key);
  console.log('process.env.project_id', process.env.project_id);
  console.log('process.env.client_email', process.env.client_email);

  admin.initializeApp({
    credential: admin.credential.cert({
      privateKey: process.env.private_key,
      projectId: process.env.project_id,
      clientEmail: process.env.client_email,
    }),
  });

  //// should npm i firebase/app
  /// client initialization
  // initializeApp(firebaseConfig);

  const app = await NestFactory.create(AppModule);

  const corsOptions: CorsOptions = {
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  };

  app.enableCors(corsOptions);
  app.use(bodyParser.json({ limit: '700kb' }));

  await app.listen(8003);
}
export default admin;
bootstrap();
