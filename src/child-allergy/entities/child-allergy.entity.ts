import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class ChildAllergy {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
