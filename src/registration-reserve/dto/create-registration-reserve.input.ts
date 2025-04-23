import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreateRegistrationReserveInput {
  @Field(() => Int)
  campRegistrationId: number;

  @Field(() => Int)
  campVariantId: number;

  @Field(() => Int)
  count: number;

  @Field({ nullable: true })
  expirationDate?: Date;
}
