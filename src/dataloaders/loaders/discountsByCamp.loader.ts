// import * as DataLoader from 'dataloader';
// import { DiscountService } from 'src/discount/discount.service';
// import { Discount } from 'src/discount/entities/discount.entity';
// var _ = require('lodash');

// class DiscountsByCamp {
//   public static create(service: DiscountService) {
//     return new DataLoader<number, Discount[]>(
//       async (keys: readonly number[]) => {
//         const data = await service.findAllergiesByChildIds(keys);
//         const childAllergies: Map<number, Allergy[]> = new Map();
//         data.forEach((allergy) => {
//           for (const child of allergy.children) {
//             if (!childAllergies.has(child.id)) {
//               childAllergies.set(child.id, []);
//             }
//             childAllergies.get(child.id).push(allergy);
//           }
//         });
//         const result = keys.map((key) => childAllergies.get(key) || []);
//         return result;
//       },
//     );
//   }
// }

// export default DiscountsByCamp;
