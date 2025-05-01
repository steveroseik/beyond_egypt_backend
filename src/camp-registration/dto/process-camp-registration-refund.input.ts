import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ProcessCampRegistrationRefundInput {
  @Field()
  campRegistrationId: number;

  @Field()
  key: string;
}
