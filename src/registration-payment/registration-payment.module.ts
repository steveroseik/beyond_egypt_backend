import { Module } from '@nestjs/common';
import { RegistrationPaymentService } from './registration-payment.service';
import { RegistrationPaymentResolver } from './registration-payment.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistrationPayment } from './entities/registration-payment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RegistrationPayment])],
  providers: [RegistrationPaymentResolver, RegistrationPaymentService],
  exports: [RegistrationPaymentService],
})
export class RegistrationPaymentModule {}
