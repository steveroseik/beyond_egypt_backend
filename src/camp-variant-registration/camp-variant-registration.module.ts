import { Module } from '@nestjs/common';
import { CampVariantRegistrationService } from './camp-variant-registration.service';
import { CampVariantRegistrationResolver } from './camp-variant-registration.resolver';

@Module({
  providers: [CampVariantRegistrationResolver, CampVariantRegistrationService],
})
export class CampVariantRegistrationModule {}
