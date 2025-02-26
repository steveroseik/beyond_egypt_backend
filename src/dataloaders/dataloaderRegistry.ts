import { MealService } from 'src/meal/meal.service';
import { MealsLoader } from './loaders/meals.loader';

export class DataloaderRegistry {
  private cache: Record<string, any> = {};

  constructor(private mealService: MealService) {}

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
  /**
   * Just a pretty type-safe facade for invoking `this.get`.
   * Make more of your own as you wish.
   */
}
