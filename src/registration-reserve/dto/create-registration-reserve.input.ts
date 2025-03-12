import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreateRegistrationReserveInput {
  @Field(() => Int)
  campRegistrationId: number;

  @Field(() => Int)
  campVariantId: number;

  @Field(() => Int)
  count: number;

  @Field(() => Int)
  paymentId: number;

  @Field(() => String)
  userId: string;

  @Field()
  expirationDate: Date;
}
