import { MealService } from 'src/meal/meal.service';
import { MealsLoader } from './loaders/meals.loader';
import { FilesLoader } from './loaders/files.loader';
import { FileService } from 'src/file/file.service';

export class DataloaderRegistry {
  private cache: Record<string, any> = {};

  constructor(
    private mealService: MealService,
    private fileService: FileService,
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
    return this.get('FilesLoader', () => FilesLoader.create(this.fileService));
  }

  /**
   * Just a pretty type-safe facade for invoking `this.get`.
   * Make more of your own as you wish.
   */
}
