import { Module } from '@nestjs/common';
import { DataloaderRegistry } from './dataloaderRegistry';
import { DataloaderRegistryFactory } from './dataloaderRegistryFactory';
import { MealModule } from 'src/meal/meal.module';

@Module({
  imports: [MealModule],
  providers: [DataloaderRegistry, DataloaderRegistryFactory],
  exports: [DataloaderRegistryFactory],
})
export class DataloadersModule {}
