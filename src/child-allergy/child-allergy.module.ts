import { Module } from '@nestjs/common';
import { ChildAllergyService } from './child-allergy.service';
import { ChildAllergyResolver } from './child-allergy.resolver';

@Module({
  providers: [ChildAllergyResolver, ChildAllergyService],
})
export class ChildAllergyModule {}
