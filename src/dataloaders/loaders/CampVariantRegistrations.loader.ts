import * as DataLoader from 'dataloader';
import { CampVariantRegistrationService } from 'src/camp-variant-registration/camp-variant-registration.service';
import { CampVariantRegistration } from 'src/camp-variant-registration/entities/camp-variant-registration.entity';
var _ = require('lodash');

class CampVariantRegistrationsDataLoader {
  public static create(service: CampVariantRegistrationService) {
    return new DataLoader<number, CampVariantRegistration[]>(
      async (keys: readonly number[]) => {
        const data = await service.findCampVariantsRegistrationsByCampId(keys);
        const grouped = _.groupBy(data, 'campRegistrationId');
        const result = keys.map((key) =>
          grouped.hasOwnProperty(key) ? grouped[key] : [],
        );
        return result;
      },
    );
  }
}

export default CampVariantRegistrationsDataLoader;
