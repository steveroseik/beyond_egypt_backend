import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class FindInactiveUserInput {
  @Field()
  id: string;

  @Field({ defaultValue: true })
  isParent: boolean;
}
