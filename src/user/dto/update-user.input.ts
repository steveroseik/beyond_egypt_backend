import { CreateChildInput } from 'src/child/dto/create-child.input';
import { CreateUserInput } from './create-user.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';
import { CreateParentAdditionalInput } from 'src/parent-additional/dto/create-parent-additional.input';

@InputType()
export class UpdateUserInput {
  @Field()
  id: string;

  @Field(() => [Int], { nullable: true, defaultValue: [] })
  childrenToDelete: number[];

  @Field(() => [Int], { nullable: true, defaultValue: [] })
  parentAdditionalToDelete: number[];

  @Field(() => [CreateChildInput], { nullable: true, defaultValue: [] })
  childrenToAdd: CreateChildInput[];

  @Field(() => [CreateParentAdditionalInput], {
    nullable: true,
    defaultValue: [],
  })
  parentAdditionalToAdd: CreateParentAdditionalInput[];

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  phone?: string;

  @Field({ nullable: true })
  occupation?: string;
}
