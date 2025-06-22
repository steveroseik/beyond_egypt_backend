import * as DataLoader from 'dataloader';
import { RegistrationPayment } from 'src/registration-payment/entities/registration-payment.entity';
import { RegistrationPaymentService } from 'src/registration-payment/registration-payment.service';
var _ = require('lodash');

export class PendingRegistrationPaymentsCampRegLoader {
  public static create(service: RegistrationPaymentService) {
    return new DataLoader<number, RegistrationPayment[]>(
      async (keys: readonly number[]) => {
        const data = await service.findLatestPendingPaymentsByCampReg(keys);
        const grouped = _.groupBy(data, 'campRegistrationId');
        return keys.map((key) =>
          grouped.hasOwnProperty(key) ? grouped[key] : [],
        );
      },
    );
  }
}
