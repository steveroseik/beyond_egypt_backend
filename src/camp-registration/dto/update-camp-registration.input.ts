import { CreateCampRegistrationInput } from './create-camp-registration.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateCampRegistrationInput extends PartialType(
  CreateCampRegistrationInput,
) {
  @Field(() => Int)
  id: number;

  @Field(() => [Int], { nullable: true })
  variantsToDelete: number[];
}
