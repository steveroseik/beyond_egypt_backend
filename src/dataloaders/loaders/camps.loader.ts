import * as DataLoader from 'dataloader';
import { CampService } from 'src/camp/camp.service';
import { Camp } from 'src/camp/entities/camp.entity';

export class CampsDataLoader {
  public static create(service: CampService) {
    return new DataLoader<number, Camp>(async (keys: readonly number[]) => {
      const camps = await service.findAllByKeys(keys);
      return keys.map((key) => camps.find((file) => file.id === key));
    });
  }
}
