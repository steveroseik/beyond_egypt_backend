import { Module } from '@nestjs/common';
import { DataloaderRegistry } from './dataloaderRegistry';
import { DataloaderRegistryFactory } from './dataloaderRegistryFactory';
import { MealModule } from 'src/meal/meal.module';
import { FileModule } from 'src/file/file.module';
import { CampVariantModule } from 'src/camp-variant/camp-variant.module';
import { LocationModule } from 'src/location/location.module';

@Module({
  imports: [MealModule, FileModule, CampVariantModule, LocationModule],
  providers: [DataloaderRegistry, DataloaderRegistryFactory],
  exports: [DataloaderRegistryFactory],
})
export class DataloadersModule {}
