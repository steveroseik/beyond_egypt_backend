import { Module } from '@nestjs/common';
import { CampVariantRegistrationService } from './camp-variant-registration.service';
import { CampVariantRegistrationResolver } from './camp-variant-registration.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampVariantRegistration } from './entities/camp-variant-registration.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CampVariantRegistration])],
  providers: [CampVariantRegistrationResolver, CampVariantRegistrationService],
  exports: [CampVariantRegistrationService],
})
export class CampVariantRegistrationModule {}
