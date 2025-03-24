import { Module } from '@nestjs/common';
import { CampRegistrationService } from './camp-registration.service';
import { CampRegistrationResolver } from './camp-registration.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampRegistration } from './entities/camp-registration.entity';
import { AwsBucketModule } from 'src/aws-bucket/aws-bucket.module';

@Module({
  imports: [TypeOrmModule.forFeature([CampRegistration]), AwsBucketModule],
  providers: [CampRegistrationResolver, CampRegistrationService],
  exports: [CampRegistrationService],
})
export class CampRegistrationModule {}
