import { CreateDiscountInput } from './create-discount.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateDiscountInput extends PartialType(CreateDiscountInput) {
  @Field(() => Int)
  id: number;
}
