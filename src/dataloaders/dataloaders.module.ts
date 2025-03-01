import { Module } from '@nestjs/common';
import { DataloaderRegistry } from './dataloaderRegistry';
import { DataloaderRegistryFactory } from './dataloaderRegistryFactory';
import { MealModule } from 'src/meal/meal.module';
import { FileModule } from 'src/file/file.module';

@Module({
  imports: [MealModule, FileModule],
  providers: [DataloaderRegistry, DataloaderRegistryFactory],
  exports: [DataloaderRegistryFactory],
})
export class DataloadersModule {}
