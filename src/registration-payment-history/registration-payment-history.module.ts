import { Module } from '@nestjs/common';
import { RegistrationPaymentHistoryService } from './registration-payment-history.service';
import { RegistrationPaymentHistoryResolver } from './registration-payment-history.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistrationPaymentHistory } from './entities/registration-payment-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RegistrationPaymentHistory])],
  providers: [
    RegistrationPaymentHistoryResolver,
    RegistrationPaymentHistoryService,
  ],
  exports: [RegistrationPaymentHistoryService],
})
export class RegistrationPaymentHistoryModule {}
