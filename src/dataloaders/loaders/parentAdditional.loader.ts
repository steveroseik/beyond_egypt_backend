import * as DataLoader from 'dataloader';
import { ParentAdditional } from 'src/parent-additional/entities/parent-additional.entity';
import { ParentAdditionalService } from 'src/parent-additional/parent-additional.service';

var _ = require('lodash');

export class ParentAdditionalDataLoader {
  public static create(service: ParentAdditionalService) {
    return new DataLoader<string, ParentAdditional[]>(
      async (keys: readonly string[]) => {
        const data = await service.findAllByKeys(keys);
        const grouped = _.groupBy(data, 'userId');
        return keys.map((key) =>
          grouped.hasOwnProperty(key) ? grouped[key] : [],
        );
      },
    );
  }
}
