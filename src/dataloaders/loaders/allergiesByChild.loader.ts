import * as DataLoader from 'dataloader';
import { AllergyService } from 'src/allergy/allergy.service';
import { Allergy } from 'src/allergy/entities/allergy.entity';
var _ = require('lodash');

class AllergiesByChildDataLoader {
  public static create(service: AllergyService) {
    return new DataLoader<number, Allergy[]>(
      async (keys: readonly number[]) => {
        const data = await service.findAllergiesByChildIds(keys);
        const childAllergies: Map<number, Allergy[]> = new Map();
        data.forEach((allergy) => {
          for (const child of allergy.children) {
            if (!childAllergies.has(child.id)) {
              childAllergies.set(child.id, []);
            }
            childAllergies.get(child.id).push(allergy);
          }
        });
        const result = keys.map((key) => childAllergies.get(key) || []);
        return result;
      },
    );
  }
}

export default AllergiesByChildDataLoader;
