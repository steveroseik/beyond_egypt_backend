// import * as DataLoader from 'dataloader';
// import { Meal } from 'src/meal/entities/meal.entity';
// import { MealService } from 'src/meal/meal.service';

// export class MealsLoader {
//   public static create(service: MealService) {
//     return new DataLoader<number, Meal[]>(async (keys: readonly number[]) => {
//       const meals = await service.findMealsByCampIds(keys);
//       return keys.map((key) =>
//         meals.filter((meal) => meal.camps?.some((camp) => camp.id === key)),
//       );
//     });
//   }
// }
