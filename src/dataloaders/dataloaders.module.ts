import { Module } from '@nestjs/common';
import { DataloaderRegistry } from './dataloaderRegistry';
import { DataloaderRegistryFactory } from './dataloaderRegistryFactory';
import { MealModule } from 'src/meal/meal.module';
import { FileModule } from 'src/file/file.module';
import { CampVariantModule } from 'src/camp-variant/camp-variant.module';
import { LocationModule } from 'src/location/location.module';
import { ParentAdditionalModule } from 'src/parent-additional/parent-additional.module';
import { ChildModule } from 'src/child/child.module';

@Module({
  imports: [
    MealModule,
    FileModule,
    CampVariantModule,
    LocationModule,
    ParentAdditionalModule,
    ChildModule,
  ],
  providers: [DataloaderRegistry, DataloaderRegistryFactory],
  exports: [DataloaderRegistryFactory],
})
export class DataloadersModule {}
