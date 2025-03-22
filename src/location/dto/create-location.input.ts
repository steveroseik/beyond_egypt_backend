import { InputType, Int, Field } from '@nestjs/graphql';
import { GraphqlPoint } from 'support/scalars';

@InputType()
export class CreateLocationInput {
  @Field()
  name: string;

  @Field(() => GraphqlPoint, { nullable: true })
  location?: JSON;
}
