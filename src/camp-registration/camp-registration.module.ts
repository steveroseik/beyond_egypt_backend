import { Module } from '@nestjs/common';
import { CampRegistrationService } from './camp-registration.service';
import { CampRegistrationResolver } from './camp-registration.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampRegistration } from './entities/camp-registration.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CampRegistration])],
  providers: [CampRegistrationResolver, CampRegistrationService],
  exports: [CampRegistrationService],
})
export class CampRegistrationModule {}
