import * as DataLoader from 'dataloader';
import { AgeRangeService } from 'src/age-range/age-range.service';
import { AgeRange } from 'src/age-range/entities/age-range.entity';
var _ = require('lodash');

class AgeRangesByCampDataLoader {
  public static create(service: AgeRangeService) {
    return new DataLoader<number, AgeRange[]>(
      async (keys: readonly number[]) => {
        const data = await service.findAgeRangesByCampIds(keys);
        const grouped = _.groupBy(data, 'camp.id');
        const result = keys.map((key) =>
          grouped.hasOwnProperty(key) ? grouped[key] : [],
        );
        return result;
      },
    );
  }
}

export default AgeRangesByCampDataLoader;
