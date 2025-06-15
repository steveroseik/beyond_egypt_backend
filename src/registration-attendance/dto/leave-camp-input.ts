import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class LeaveCampInput {
  @Field()
  registrationAttendanceId: number;
  @Field()
  token: string;
}
