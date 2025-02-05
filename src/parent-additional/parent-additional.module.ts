import { Module } from '@nestjs/common';
import { ParentAdditionalService } from './parent-additional.service';
import { ParentAdditionalResolver } from './parent-additional.resolver';

@Module({
  providers: [ParentAdditionalResolver, ParentAdditionalService],
})
export class ParentAdditionalModule {}
