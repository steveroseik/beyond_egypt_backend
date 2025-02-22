import { Module } from '@nestjs/common';
import { AgeRangeService } from './age-range.service';
import { AgeRangeResolver } from './age-range.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgeRange } from './entities/age-range.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AgeRange])],
  providers: [AgeRangeResolver, AgeRangeService],
  exports: [AgeRangeService],
})
export class AgeRangeModule {}
