import { CreateAllergyInput } from './create-allergy.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateAllergyInput extends PartialType(CreateAllergyInput) {
  @Field(() => Int)
  id: number;
}
