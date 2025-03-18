import { CreateParentAdditionalInput } from './create-parent-additional.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateParentAdditionalInput {
  @Field(() => Int)
  id: number;

  @Field({ nullable: true })
  userId?: string;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  phone?: string;
}
