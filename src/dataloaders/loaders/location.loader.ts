import * as DataLoader from 'dataloader';
import { Location } from 'src/location/entities/location.entity';
import { LocationService } from 'src/location/location.service';

export class LocationsDataLoader {
  public static create(service: LocationService) {
    return new DataLoader<number, Location>(async (keys: readonly number[]) => {
      const data = await service.findAllByKeys(keys);
      return keys.map((key) => data.find((file) => file.id === key));
    });
  }
}
