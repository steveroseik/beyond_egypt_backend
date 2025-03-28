import * as DataLoader from 'dataloader';
import { AllergyService } from 'src/allergy/allergy.service';
import { Allergy } from 'src/allergy/entities/allergy.entity';
var _ = require('lodash');

class AllergiesByChildDataLoader {
  public static create(service: AllergyService) {
    return new DataLoader<number, Allergy[]>(
      async (keys: readonly number[]) => {
        const data = await service.findAllergiesByChildIds(keys);
        const grouped = _.groupBy(data, 'child.id');
        const result = keys.map((key) =>
          grouped.hasOwnProperty(key) ? grouped[key] : [],
        );
        return result;
      },
    );
  }
}

export default AllergiesByChildDataLoader;
