import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, QueryRunner, In } from 'typeorm';
import { PaymobReturnDto } from './models/payment.payload';
import {
  createPaymobIntention,
  generatePaymobCheckoutUrl,
} from './generate/payment.generate';
import { RegistrationPayment } from 'src/registration-payment/entities/registration-payment.entity';
import * as moment from 'moment-timezone';
import {
  CampRegistrationStatus,
  PaymentMethod,
  PaymentStatus,
} from 'support/enums';
import { RegistrationReserve } from 'src/registration-reserve/entities/registration-reserve.entity';
import { Response } from 'express';
import * as dotenv from 'dotenv';
import { generateQueryParams } from 'support/query-params.generator';
import { CampRegistration } from 'src/camp-registration/entities/camp-registration.entity';
import { MailService } from 'src/mail/mail.service';
import { User } from 'src/user/entities/user.entity';
import { Decimal } from 'support/scalars';
import { moneyFixation } from 'support/constants';
import { CampVariant } from 'src/camp-variant/entities/camp-variant.entity';
import {
  validatePaymobPayment,
  requestPaymobRefund,
} from './generate/payment.generate';
import { getSumOfPaidAmounts } from 'support/helpers/calculate-sum-of-paid';
import { generateMerchantRefNumber } from 'support/random-uuid.generator';

dotenv.config();

@Injectable()
export class PaymobService {
  constructor(
    private dataSource: DataSource,
    private mailService: MailService,
  ) {}

  async handleReturn(query: PaymobReturnDto, res: Response) {
    console.log('Paymob Return Query:', query);
    console.log('Paymob res');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const payment = await queryRunner.manager.findOne(RegistrationPayment, {
        where: { referenceNumber: query.merchant_order_id },
        relations: ['campRegistration'],
      });

      if (!payment) {
        throw Error('Payment not found');
      }

      // validate the paymob response
      const response = await this.validatePaymentResponse(
        query,
        payment,
        queryRunner,
        res,
      );

      await queryRunner.commitTransaction();
      return response;
    } catch (e) {
      await queryRunner.rollbackTransaction();
      console.log(e);
      const parameters = {
        success: false,
        message: e.message ?? 'An error occurred',
      };

      await this.dataSource.manager.update(
        RegistrationPayment,
        { referenceNumber: `${query.merchant_order_id}` },
        { status: PaymentStatus.failed },
      );

      return res.redirect(
        `${process.env.FRONTEND_URL}/payment-failed?${generateQueryParams(parameters)}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async validatePaymentResponse(
    query: PaymobReturnDto,
    payment: RegistrationPayment,
    queryRunner: QueryRunner,
    res: Response,
  ) {
    let parameters = {
      success: false,
      networkError: false,
      message: 'Payment failed',
      paymentUrl: payment.url,
      expirationDate: payment.expirationDate,
      campRegistrationId: payment.campRegistrationId,
      campId: payment.campRegistration.campId,
    };

    // First, check the direct response data
    if (query.success !== 'true') {
      return res.redirect(
        `${process.env.FRONTEND_URL}/payment-failed?${generateQueryParams(parameters)}`,
      );
    }

    // Check if payment is pending
    if (query.pending === 'true') {
      parameters.message = 'Payment is pending';
      return res.redirect(
        `${process.env.FRONTEND_URL}/payment-failed?${generateQueryParams(parameters)}`,
      );
    }

    // If direct response indicates success, validate with Paymob API
    try {
      const expectedAmount = Math.round(payment.amount.toNumber() * 100); // Convert to cents
      const validationResult = await validatePaymobPayment(
        query.id,
        expectedAmount,
        query.merchant_order_id,
      );

      if (!validationResult.isValid) {
        parameters.networkError = true;
        parameters.message = 'Payment validation failed';
        return res.redirect(
          `${process.env.FRONTEND_URL}/payment-failed?${generateQueryParams(parameters)}`,
        );
      }
    } catch (error) {
      console.error('Paymob API validation error:', error);
      parameters.networkError = true;
      parameters.message = 'Payment validation failed - network error';
      return res.redirect(
        `${process.env.FRONTEND_URL}/payment-failed?${generateQueryParams(parameters)}`,
      );
    }

    // Update payment with Paymob reference number and mark as paid
    const update = await queryRunner.manager.update(
      RegistrationPayment,
      { id: payment.id },
      {
        paymentProviderRef: query.id,
        status: PaymentStatus.paid,
      },
    );

    if (update.affected !== 1) {
      throw new Error('Failed to update payment status');
    }

    // Update camp registration status
    const updateCampRegistration = await queryRunner.manager.update(
      CampRegistration,
      { id: payment.campRegistrationId },
      {
        status: CampRegistrationStatus.accepted,
        paidAmount: () => `paidAmount + ${payment.amount}`,
      },
    );

    if (updateCampRegistration.affected !== 1) {
      if (payment.status != PaymentStatus.expired) {
        await queryRunner.manager.delete(RegistrationReserve, {
          campRegistrationId: payment.campRegistrationId,
        });

        throw new Error('Failed to update camp registration status');
      }
    }

    await this.deductVacancies(payment.campRegistrationId, queryRunner);

    this.mailService.sendCampRegistrationConfirmation(
      payment.campRegistrationId,
    );

    return res.redirect(
      `${process.env.FRONTEND_URL}/payment-success?paymentId=${payment.id}`,
    );
  }

  async deductVacancies(campRegistrationId: number, queryRunner: QueryRunner) {
    const reserves = await queryRunner.manager.find(RegistrationReserve, {
      where: { campRegistrationId },
    });

    if (!reserves?.length) {
      return;
    }

    const variantIds = reserves.map((e) => e.campVariantId);

    await queryRunner.manager.find(CampVariant, {
      where: { id: In(variantIds) },
      lock: { mode: 'pessimistic_write' },
    });

    for (const { campVariantId, count } of reserves) {
      const update = await queryRunner.manager.update(
        CampVariant,
        { id: campVariantId },
        {
          remainingCapacity: () => `remainingCapacity - ${count}`,
        },
      );
      if (update.affected !== 1) {
        throw new Error('Failed to update camp variant capacity');
      }
    }

    // Delete the reserves after deducting vacancies
    const deleteReserves = await queryRunner.manager.delete(
      RegistrationReserve,
      {
        campRegistrationId,
      },
    );
    if (deleteReserves.affected !== reserves.length) {
      throw new Error('Failed to delete all camp reserves');
    }
  }

  async generatePaymobPaymentUrl(
    campRegistration: CampRegistration,
    totalAmount: Decimal,
    paymentId: number,
    parent: User,
    tenMinutesFromNow: moment.Moment,
  ): Promise<{ paymentUrl: string; merchantRef: string }> {
    const merchantRef = generateMerchantRefNumber(paymentId);

    const payload = {
      amount: Math.round(totalAmount.toNumber() * 100), // Convert to cents
      currency: 'EGP',
      payment_methods: [parseInt(process.env.PAYMOB_INTEGRATION_ID)],
      items: [
        {
          name: `Camp Registration - ${campRegistration.id}`,
          amount: Math.round(totalAmount.toNumber() * 100), // Convert to cents
          description: 'Camp Registration Payment',
          quantity: 1,
        },
      ],
      billing_data: {
        apartment: 'N/A',
        first_name: parent.name.split(' ')[0] || parent.name,
        last_name: parent.name.split(' ').slice(1).join(' ') || 'N/A',
        street: 'N/A',
        building: 'N/A',
        phone_number: parent.phone,
        city: 'N/A',
        country: 'EGY',
        email: parent.email,
        floor: 'N/A',
        state: 'N/A',
      },
      special_reference: merchantRef,
      expiration: 10 * 60,
      notification_url: `${process.env.BASE_URL}/paymob/webhook`,
      redirection_url: `${process.env.BASE_URL}/paymob/return`,
    };

    console.log('Paymob Payload:', payload);

    const intentionResponse = await createPaymobIntention(payload);
    const paymentUrl = generatePaymobCheckoutUrl(
      process.env.PAYMOB_PUBLIC_KEY,
      intentionResponse.client_secret,
    );

    return {
      paymentUrl,
      merchantRef,
    };
  }
}
