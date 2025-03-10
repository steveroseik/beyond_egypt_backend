import * as DataLoader from 'dataloader';
import { ChildService } from 'src/child/child.service';
import { Child } from 'src/child/entities/child.entity';
var _ = require('lodash');

export class ChildByParentDataLoader {
  public static create(service: ChildService) {
    return new DataLoader<string, Child>(async (keys: readonly string[]) => {
      const data = await service.findAllByParentId(keys);
      const grouped = _.groupBy(data, 'parentId');
      return keys.map((key) =>
        grouped.hasOwnProperty(key) ? grouped[key] : [],
      );
    });
  }
}
