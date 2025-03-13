import * as DataLoader from 'dataloader';
import { CampVariantService } from 'src/camp-variant/camp-variant.service';
import { CampVariant } from 'src/camp-variant/entities/camp-variant.entity';
import { CampService } from 'src/camp/camp.service';
import { Camp } from 'src/camp/entities/camp.entity';
var _ = require('lodash');

class EventCampsDataLoader {
  public static create(service: CampService) {
    return new DataLoader<number, Camp[]>(async (keys: readonly number[]) => {
      const data = await service.findCampsByEventId(keys);
      const grouped = _.groupBy(data, 'eventId');
      const result = keys.map((key) =>
        grouped.hasOwnProperty(key) ? grouped[key] : [],
      );
      return result;
    });
  }
}

export default EventCampsDataLoader;
