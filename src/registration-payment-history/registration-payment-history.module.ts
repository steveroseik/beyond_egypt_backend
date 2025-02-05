import { Module } from '@nestjs/common';
import { RegistrationPaymentHistoryService } from './registration-payment-history.service';
import { RegistrationPaymentHistoryResolver } from './registration-payment-history.resolver';

@Module({
  providers: [RegistrationPaymentHistoryResolver, RegistrationPaymentHistoryService],
})
export class RegistrationPaymentHistoryModule {}
