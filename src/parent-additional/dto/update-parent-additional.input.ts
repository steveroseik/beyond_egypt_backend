import { CreateParentAdditionalInput } from './create-parent-additional.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateParentAdditionalInput {
  @Field(() => Int)
  id: number;
}
