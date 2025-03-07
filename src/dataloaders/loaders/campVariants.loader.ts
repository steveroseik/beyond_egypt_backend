import * as DataLoader from 'dataloader';
import { CampVariantService } from 'src/camp-variant/camp-variant.service';
import { CampVariant } from 'src/camp-variant/entities/camp-variant.entity';
var _ = require('lodash');

class CampVariantsDataLoader {
  public static create(service: CampVariantService) {
    return new DataLoader<number, CampVariant[]>(
      async (keys: readonly number[]) => {
        const data = await service.findCampVariantsByCampId(keys);
        const grouped = _.groupBy(data, 'campId');
        const result = keys.map((key) =>
          grouped.hasOwnProperty(key) ? grouped[key] : [],
        );
        return result;
      },
    );
  }
}

export default CampVariantsDataLoader;
