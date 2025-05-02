import * as DataLoader from 'dataloader';
import { CampRegistrationService } from 'src/camp-registration/camp-registration.service';
import { CampRegistration } from 'src/camp-registration/entities/camp-registration.entity';

export class CampRegistrationDataLoader {
  public static create(service: CampRegistrationService) {
    return new DataLoader<number, CampRegistration>(
      async (keys: readonly number[]) => {
        const files = await service.findAllByKeys(keys);
        return keys.map((key) => files.find((file) => file.id === key));
      },
    );
  }
}
