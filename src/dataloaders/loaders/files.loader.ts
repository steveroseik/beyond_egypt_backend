import * as DataLoader from 'dataloader';
import { File } from 'src/file/entities/file.entity';
import { FileService } from 'src/file/file.service';

export class FilesLoader {
  public static create(service: FileService) {
    console.log('HENAA');
    return new DataLoader<number, File>(async (keys: readonly number[]) => {
      console.log('HENAA 222');
      const files = await service.findAllByKeys(keys);
      return keys.map((key) => files.find((file) => file.id === key));
    });
  }
}
