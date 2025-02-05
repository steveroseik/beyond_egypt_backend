import { CreateCampInput } from './create-camp.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateCampInput extends PartialType(CreateCampInput) {
  @Field(() => Int)
  id: number;
}
