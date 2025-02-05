import { CreateCampVariantRegistrationInput } from './create-camp-variant-registration.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateCampVariantRegistrationInput extends PartialType(CreateCampVariantRegistrationInput) {
  @Field(() => Int)
  id: number;
}
