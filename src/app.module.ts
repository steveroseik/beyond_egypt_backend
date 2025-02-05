import typeorm from '../db/data-source';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AgeRangeModule } from './age-range/age-range.module';
import { AllergyModule } from './allergy/allergy.module';
import { CampModule } from './camp/camp.module';
import { CampRegistrationModule } from './camp-registration/camp-registration.module';
import { CampVariantModule } from './camp-variant/camp-variant.module';
import { CampVariantRegistrationModule } from './camp-variant-registration/camp-variant-registration.module';
import { ChildModule } from './child/child.module';
import { ChildAllergyModule } from './child-allergy/child-allergy.module';
import { ChildReportModule } from './child-report/child-report.module';
import { ChildReportHistoryModule } from './child-report-history/child-report-history.module';
import { DiscountModule } from './discount/discount.module';
import { EventModule } from './event/event.module';
import { EventFileModule } from './event-file/event-file.module';
import { FileModule } from './file/file.module';
import { LocationModule } from './location/location.module';
import { MealModule } from './meal/meal.module';
import { ParentAdditionalModule } from './parent-additional/parent-additional.module';
import { RegistrationAttendanceModule } from './registration-attendance/registration-attendance.module';
import { RegistrationHistoryModule } from './registration-history/registration-history.module';
import { RegistrationPaymentHistoryModule } from './registration-payment-history/registration-payment-history.module';
import { SettingsModule } from './settings/settings.module';
import { UserModule } from './user/user.module';
import { DataloadersModule } from './dataloaders/dataloaders.module';
import { ApolloDriverConfig, ApolloDriver } from '@nestjs/apollo';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { GraphqlDecimal, GraphqlPoint } from 'support/scalars';
import { AccessTokenGuard } from './auth/guards/accessToken.guard';
import { DataloaderRegistryFactory } from './dataloaders/dataloaderRegistryFactory';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        configService.get('typeorm'),
    }),
    // TypeOrmModule.forRoot(config),
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
      cache: true,
      load: [typeorm],
    }),
    // GraphQLModule.forRoot<ApolloDriverConfig>({
    //   driver: ApolloDriver,
    //   installSubscriptionHandlers: true,
    //   subscriptions: {
    //     'graphql-ws': true,
    //     'subscriptions-transport-ws': true,
    //   },
    //   autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
    //   buildSchemaOptions: {
    //     numberScalarMode: 'integer',
    //     dateScalarMode: 'timestamp',
    //   },
    //   context: ({ req }) => ({ req }),
    // }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [DataloadersModule],

      inject: [DataloaderRegistryFactory],
      useFactory: (dataloaderService: DataloaderRegistryFactory) => ({
        installSubscriptionHandlers: true,
        // fieldResolverEnhancers: ['guards'],
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        buildSchemaOptions: {
          numberScalarMode: 'integer',
          dateScalarMode: 'isoDate',
          scalarsMap: [
            { type: () => GraphqlDecimal, scalar: GraphqlDecimal },
            { type: () => GraphqlPoint, scalar: GraphqlPoint },
          ],
        },
        context: () => ({
          loaders: dataloaderService.create(),
        }),
      }),
    }),
    AuthModule,
    AgeRangeModule,
    AllergyModule,
    CampModule,
    CampRegistrationModule,
    CampVariantModule,
    CampVariantRegistrationModule,
    ChildModule,
    ChildAllergyModule,
    ChildReportModule,
    ChildReportHistoryModule,
    DiscountModule,
    EventModule,
    EventFileModule,
    FileModule,
    LocationModule,
    MealModule,
    ParentAdditionalModule,
    RegistrationAttendanceModule,
    RegistrationHistoryModule,
    RegistrationPaymentHistoryModule,
    SettingsModule,
    UserModule,
    DataloadersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    DataloaderRegistryFactory,
    { provide: APP_GUARD, useClass: AccessTokenGuard },
  ],
})
export class AppModule {}
