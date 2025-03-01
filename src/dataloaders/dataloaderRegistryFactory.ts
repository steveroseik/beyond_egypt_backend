import { Injectable } from '@nestjs/common';
import { DataloaderRegistry } from './dataloaderRegistry';
import { MealService } from 'src/meal/meal.service';
import { FileService } from 'src/file/file.service';

@Injectable()
export class DataloaderRegistryFactory {
  constructor(
    private mealService: MealService,
    private fileService: FileService,
  ) {}

  public create() {
    return new DataloaderRegistry(this.mealService, this.fileService);
  }
}
