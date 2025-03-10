import * as DataLoader from 'dataloader';
import { CampVariantService } from 'src/camp-variant/camp-variant.service';
import { CampVariant } from 'src/camp-variant/entities/camp-variant.entity';

export class CampVariantsDataLoader {
  public static create(service: CampVariantService) {
    return new DataLoader<number, CampVariant>(
      async (keys: readonly number[]) => {
        const files = await service.findAllByKeys(keys);

        return keys.map((key) => files.find((file) => file.id === key));
      },
    );
  }
}
