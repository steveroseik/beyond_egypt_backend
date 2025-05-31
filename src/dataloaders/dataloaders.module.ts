import { Module } from '@nestjs/common';
import { DataloaderRegistry } from './dataloaderRegistry';
import { DataloaderRegistryFactory } from './dataloaderRegistryFactory';
import { MealModule } from 'src/meal/meal.module';
import { FileModule } from 'src/file/file.module';
import { CampVariantModule } from 'src/camp-variant/camp-variant.module';
import { LocationModule } from 'src/location/location.module';
import { ParentAdditionalModule } from 'src/parent-additional/parent-additional.module';
import { ChildModule } from 'src/child/child.module';
import { CampVariantRegistrationModule } from 'src/camp-variant-registration/camp-variant-registration.module';
import { CampModule } from 'src/camp/camp.module';
import { EventModule } from 'src/event/event.module';
import { AgeRangeModule } from 'src/age-range/age-range.module';
import { AllergyModule } from 'src/allergy/allergy.module';
import { UserModule } from 'src/user/user.module';
import { DiscountModule } from 'src/discount/discount.module';
import { CampRegistrationModule } from 'src/camp-registration/camp-registration.module';
import { ChildReportHistoryModule } from 'src/child-report-history/child-report-history.module';

@Module({
  imports: [
    MealModule,
    FileModule,
    CampVariantModule,
    LocationModule,
    ParentAdditionalModule,
    ChildModule,
    CampVariantRegistrationModule,
    CampModule,
    EventModule,
    AgeRangeModule,
    AllergyModule,
    UserModule,
    DiscountModule,
    CampRegistrationModule,
    ChildReportHistoryModule,
  ],
  providers: [DataloaderRegistry, DataloaderRegistryFactory],
  exports: [DataloaderRegistryFactory],
})
export class DataloadersModule {}
