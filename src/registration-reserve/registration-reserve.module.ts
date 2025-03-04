import { Module } from '@nestjs/common';
import { RegistrationReserveService } from './registration-reserve.service';
import { RegistrationReserveResolver } from './registration-reserve.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistrationReserve } from './entities/registration-reserve.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RegistrationReserve])],
  providers: [RegistrationReserveResolver, RegistrationReserveService],
  exports: [RegistrationReserveService],
})
export class RegistrationReserveModule {}
