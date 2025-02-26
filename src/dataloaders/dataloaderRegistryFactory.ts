import { Injectable } from '@nestjs/common';
import { DataloaderRegistry } from './dataloaderRegistry';
import { MealService } from 'src/meal/meal.service';

@Injectable()
export class DataloaderRegistryFactory {
  constructor(private mealService: MealService) {}

  public create() {
    return new DataloaderRegistry(this.mealService);
  }
}
