import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreateAgeRangeInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  minAge?: number;

  @Field({ nullable: true })
  maxAge?: number;
}
