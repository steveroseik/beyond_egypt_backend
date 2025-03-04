import { Module } from '@nestjs/common';
import { RegistrationPaymentHistoryService } from './registration-payment.service';
import { RegistrationPaymentHistoryResolver } from './registration-payment.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistrationPayment } from './entities/registration-payment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RegistrationPayment])],
  providers: [
    RegistrationPaymentHistoryResolver,
    RegistrationPaymentHistoryService,
  ],
  exports: [RegistrationPaymentHistoryService],
})
export class RegistrationPaymentHistoryModule {}
