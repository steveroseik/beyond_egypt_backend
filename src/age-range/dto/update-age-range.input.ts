import { CreateAgeRangeInput } from './create-age-range.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateAgeRangeInput extends PartialType(CreateAgeRangeInput) {
  @Field(() => Int)
  id: number;
}
