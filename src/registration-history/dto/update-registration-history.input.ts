import { CreateRegistrationHistoryInput } from './create-registration-history.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateRegistrationHistoryInput extends PartialType(CreateRegistrationHistoryInput) {
  @Field(() => Int)
  id: number;
}
