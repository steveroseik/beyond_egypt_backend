import { Module } from '@nestjs/common';
import { CampRegistrationService } from './camp-registration.service';
import { CampRegistrationResolver } from './camp-registration.resolver';

@Module({
  providers: [CampRegistrationResolver, CampRegistrationService],
})
export class CampRegistrationModule {}
