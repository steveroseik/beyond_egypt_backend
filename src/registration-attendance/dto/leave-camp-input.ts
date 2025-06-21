import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class LeaveCampInput {
  @Field()
  registrationAttendanceId: number;

  @Field({ nullable: true })
  leaveTime?: Date;
}
