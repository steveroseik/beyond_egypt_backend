import { Module } from '@nestjs/common';
import { SchoolService } from './school.service';
import { SchoolResolver } from './school.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { School } from './entities/school.entity';
import { AwsBucketModule } from 'src/aws-bucket/aws-bucket.module';

@Module({
  imports: [TypeOrmModule.forFeature([School]), AwsBucketModule],
  providers: [SchoolResolver, SchoolService],
  exports: [SchoolService],
})
export class SchoolModule {}
