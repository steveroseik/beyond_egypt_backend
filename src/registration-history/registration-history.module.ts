import { Module } from '@nestjs/common';
import { RegistrationHistoryService } from './registration-history.service';
import { RegistrationHistoryResolver } from './registration-history.resolver';

@Module({
  providers: [RegistrationHistoryResolver, RegistrationHistoryService],
})
export class RegistrationHistoryModule {}
