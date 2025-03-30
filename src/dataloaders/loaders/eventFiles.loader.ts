import * as DataLoader from 'dataloader';
import { File } from 'src/file/entities/file.entity';
import { FileService } from 'src/file/file.service';
var _ = require('lodash');

class EventFilesDataLoader {
  public static create(service: FileService) {
    return new DataLoader<number, File[]>(async (keys: readonly number[]) => {
      const data = await service.findFilesByEventIds(keys);

      const eventFiles: Map<number, File[]> = new Map();
      data.forEach((file) => {
        for (const event of file.events) {
          if (!eventFiles.has(event.id)) {
            eventFiles.set(event.id, []);
          }
          eventFiles.get(event.id).push(file);
        }
      });
      const result = keys.map((key) => eventFiles.get(key) || []);
      return result;
    });
  }
}

export default EventFilesDataLoader;
