import { Module } from '@nestjs/common';
import { AllergyService } from './allergy.service';
import { AllergyResolver } from './allergy.resolver';

@Module({
  providers: [AllergyResolver, AllergyService],
})
export class AllergyModule {}
