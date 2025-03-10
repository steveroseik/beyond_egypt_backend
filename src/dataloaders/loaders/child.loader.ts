import * as DataLoader from 'dataloader';
import { ChildService } from 'src/child/child.service';
import { Child } from 'src/child/entities/child.entity';

export class ChildDataLoader {
  public static create(service: ChildService) {
    return new DataLoader<number, Child>(async (keys: readonly number[]) => {
      const data = await service.findAllByKeys(keys);
      return keys.map((key) => data.find((file) => file.id === key));
    });
  }
}
