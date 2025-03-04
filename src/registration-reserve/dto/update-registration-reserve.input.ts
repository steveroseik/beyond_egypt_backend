import { CreateRegistrationReserveInput } from './create-registration-reserve.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateRegistrationReserveInput extends PartialType(CreateRegistrationReserveInput) {
  @Field(() => Int)
  id: number;
}
