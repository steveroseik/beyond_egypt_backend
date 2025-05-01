import { RegistrationPayment } from 'src/registration-payment/entities/registration-payment.entity';
import { PaymentStatus } from 'support/enums';
import { Decimal } from 'support/scalars';
import { QueryRunner } from 'typeorm';

export async function getSumOfPaidAmounts(
  campRegistrationId: number,
  queryRunner: QueryRunner,
): Promise<Decimal> {
  const response = await queryRunner.manager
    .createQueryBuilder(RegistrationPayment, 'registrationPayment')
    .select('SUM(amount) as paidAmount')
    .where({ status: PaymentStatus.paid, campRegistrationId })
    .getRawOne();

  return new Decimal(`${response?.paidAmount ?? 0}`);
}
