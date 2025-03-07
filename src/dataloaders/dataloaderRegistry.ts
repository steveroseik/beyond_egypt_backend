import { MealService } from 'src/meal/meal.service';
import { MealsLoader } from './loaders/meals.loader';
import { FilesLoader } from './loaders/files.loader';
import { FileService } from 'src/file/file.service';
import CampVariantsDataLoader from './loaders/campVariants.loader';
import { CampVariantService } from 'src/camp-variant/camp-variant.service';
import { LocationService } from 'src/location/location.service';
import { Location } from 'src/location/entities/location.entity';
import { LocationsDataLoader } from './loaders/location.loader';
import CampFilesDataLoader from './loaders/campFiles.loaders';

export class DataloaderRegistry {
  private cache: Record<string, any> = {};

  constructor(
    private mealService: MealService,
    private fileService: FileService,
    private campVariantService: CampVariantService,
    private locationService: LocationService,
  ) {}

  /**
   * Fetches a memoized service based on a string key, or invokes fallback to create one.
   */
  private get<T>(key: string, fallback: () => T): T {
    if (!this.cache[key]) {
      this.cache[key] = fallback();
    }
    return this.cache[key];
  }

  public get MealsLoader() {
    return this.get('MealsLoader', () => MealsLoader.create(this.mealService));
  }

  public get FilesLoader() {
    console.log('HEREE');
    return this.get('FilesLoader', () => FilesLoader.create(this.fileService));
  }

  public get CampVariantsDataLoader() {
    return this.get('CampVariantsDataLoader', () =>
      CampVariantsDataLoader.create(this.campVariantService),
    );
  }

  public get LocationsLoader() {
    return this.get('LocationsLoader', () =>
      LocationsDataLoader.create(this.locationService),
    );
  }

  public get CampFilesDataLoader() {
    return this.get('CampFilesDataLoader', () =>
      CampFilesDataLoader.create(this.fileService),
    );
  }

  /**
   * Just a pretty type-safe facade for invoking `this.get`.
   * Make more of your own as you wish.
   */
}
