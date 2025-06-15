import { RegistrationPayment } from 'src/registration-payment/entities/registration-payment.entity';
import { PaymentStatus } from 'support/enums';
import { Decimal } from 'support/scalars';
import { IsNull, Not, QueryRunner } from 'typeorm';

export async function getSumOfPaidAmounts(
  campRegistrationId: number,
  queryRunner: QueryRunner,
): Promise<Decimal> {
  const positives = await queryRunner.manager
    .createQueryBuilder(RegistrationPayment, 'registrationPayment')
    .select('SUM(amount) as paidAmount')
    .where({
      status: PaymentStatus.paid,
      campRegistrationId,
      parentId: IsNull(),
    })
    .getRawOne();

  const negatives = await queryRunner.manager
    .createQueryBuilder(RegistrationPayment, 'registrationPayment')
    .select('SUM(amount) as paidAmount')
    .where({
      status: PaymentStatus.paid,
      campRegistrationId,
      parentId: Not(IsNull()),
    })
    .getRawOne();

  return new Decimal(`${positives?.paidAmount ?? 0}`).minus(
    new Decimal(`${negatives?.paidAmount ?? 0}`),
  );
}
