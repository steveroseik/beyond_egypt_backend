import { CreateChildAllergyInput } from './create-child-allergy.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateChildAllergyInput extends PartialType(CreateChildAllergyInput) {
  @Field(() => Int)
  id: number;
}
