import { Module } from '@nestjs/common';
import { CampService } from './camp.service';
import { CampResolver } from './camp.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Camp } from './entities/camp.entity';
import { AwsBucketModule } from 'src/aws-bucket/aws-bucket.module';
import { CampRegistrationModule } from 'src/camp-registration/camp-registration.module';

@Module({
  imports: [TypeOrmModule.forFeature([Camp]), CampRegistrationModule],
  providers: [CampResolver, CampService],
  exports: [CampService],
})
export class CampModule {}
