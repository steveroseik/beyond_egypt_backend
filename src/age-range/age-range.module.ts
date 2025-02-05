import { Module } from '@nestjs/common';
import { AgeRangeService } from './age-range.service';
import { AgeRangeResolver } from './age-range.resolver';

@Module({
  providers: [AgeRangeResolver, AgeRangeService],
})
export class AgeRangeModule {}
