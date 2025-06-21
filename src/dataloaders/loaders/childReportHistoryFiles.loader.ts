import * as DataLoader from 'dataloader';
import { File } from 'src/file/entities/file.entity';
import { FileService } from 'src/file/file.service';
var _ = require('lodash');

class ChildReportHistoryFilesDataLoader {
  public static create(service: FileService) {
    return new DataLoader<number, File[]>(async (keys: readonly number[]) => {
      const data = await service.findFilesByChildReportHistoryIds(keys);
      const historyFiles: Map<number, File[]> = new Map();
      data.forEach((file) => {
        for (const history of file.childReportHistories) {
          if (!historyFiles.has(history.id)) {
            historyFiles.set(history.id, []);
          }
          historyFiles.get(history.id).push(file);
        }
      });
      const result = keys.map((key) => historyFiles.get(key) || []);
      return result;
    });
  }
}

export default ChildReportHistoryFilesDataLoader;
