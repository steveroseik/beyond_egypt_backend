import { DataSource, DataSourceOptions } from 'typeorm';
import { registerAs } from '@nestjs/config';
import * as dotenv from 'dotenv';
// import { MysqlConnectionOptions } from "typeorm/driver/mysql/MysqlConnectionOptions";
dotenv.config();
export const dataConfig: DataSourceOptions = {
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  timezone: '+02:00',
  username: 'user',
  password: process.env.local_password,
  database: 'beyond_egypt',
  migrationsRun: true,
  legacySpatialSupport: false,
  migrationsTransactionMode: 'all',
  synchronize: true,
  logging: true,
  entities: ['./dist/src/**/*.entity{.ts,.js}'],
  migrations: ['./dist/db/migrations/**/*.js'],
  migrationsTableName: 'migrations',
  extra: {
    authPlugins: {
      // Specify the authentication plugin if needed
      admin: 'caching_sha2_password',
      user: 'mysql_native_password',
    },
  },
};

export const connectionSource = new DataSource(dataConfig);

export default registerAs('typeorm', () => dataConfig);
