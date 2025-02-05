import { Module } from '@nestjs/common';
import { AwsBucketController } from './aws-bucket.controller';
import { AwsBucketService } from './aws-bucket.service';

@Module({
  controllers: [AwsBucketController],
  providers: [AwsBucketService],
  exports: [AwsBucketService],
})
export class AwsBucketModule {}
