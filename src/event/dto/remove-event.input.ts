import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveEventInput {
  @Field()
  id: number;

  @Field({ defaultValue: true })
  removeCamps: boolean;
}
