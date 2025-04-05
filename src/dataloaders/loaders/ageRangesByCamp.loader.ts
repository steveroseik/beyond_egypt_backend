import * as DataLoader from 'dataloader';
import { AgeRangeService } from 'src/age-range/age-range.service';
import { AgeRange } from 'src/age-range/entities/age-range.entity';
var _ = require('lodash');

class AgeRangesByCampDataLoader {
  public static create(service: AgeRangeService) {
    return new DataLoader<number, AgeRange[]>(
      async (keys: readonly number[]) => {
        const data = await service.findAgeRangesByCampIds(keys);
        const grouped = new Map<number, AgeRange[]>();
        data.forEach((item) => {
          for (const camp of item.camps) {
            if (!grouped.has(camp.id)) {
              grouped.set(camp.id, []);
            }
            grouped.get(camp.id).push(item);
          }
        });
        const result = keys.map((key) => grouped.get(key) ?? []);
        return result;
      },
    );
  }
}

export default AgeRangesByCampDataLoader;
