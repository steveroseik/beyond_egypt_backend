import * as DataLoader from 'dataloader';
import { FileService } from 'src/file/file.service';
var _ = require('lodash');

class EventFilesDataLoader {
  public static create(service: FileService) {
    return new DataLoader<number, File[]>(async (keys: readonly number[]) => {
      const data = await service.findFilesByEventIds(keys);
      const grouped = _.groupBy(data, 'event.id');
      const result = keys.map((key) =>
        grouped.hasOwnProperty(key) ? grouped[key] : [],
      );
      return result;
    });
  }
}

export default EventFilesDataLoader;
