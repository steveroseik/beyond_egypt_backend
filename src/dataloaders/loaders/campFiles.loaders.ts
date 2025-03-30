import * as DataLoader from 'dataloader';
import { File } from 'src/file/entities/file.entity';
import { FileService } from 'src/file/file.service';
var _ = require('lodash');

class CampFilesDataLoader {
  public static create(service: FileService) {
    return new DataLoader<number, File[]>(async (keys: readonly number[]) => {
      const data = await service.findFilesByCampIds(keys);
      const campFiles: Map<number, File[]> = new Map();
      data.forEach((file) => {
        for (const camp of file.camps) {
          if (!campFiles.has(camp.id)) {
            campFiles.set(camp.id, []);
          }
          campFiles.get(camp.id).push(file);
        }
      });
      const result = keys.map((key) => campFiles.get(key) || []);
      return result;
    });
  }
}

export default CampFilesDataLoader;
