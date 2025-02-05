import { CreateChildInput } from './create-child.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateChildInput extends PartialType(CreateChildInput) {
  @Field(() => Int)
  id: number;
}
