import { Injectable } from '@nestjs/common';
import { DataloaderRegistry } from './dataloaderRegistry';
import { MealService } from 'src/meal/meal.service';
import { FileService } from 'src/file/file.service';
import { CampVariantService } from 'src/camp-variant/camp-variant.service';
import { LocationService } from 'src/location/location.service';

@Injectable()
export class DataloaderRegistryFactory {
  constructor(
    private mealService: MealService,
    private fileService: FileService,
    private campVariantService: CampVariantService,
    private locationService: LocationService,
  ) {}

  public create() {
    return new DataloaderRegistry(
      this.mealService,
      this.fileService,
      this.campVariantService,
      this.locationService,
    );
  }
}
