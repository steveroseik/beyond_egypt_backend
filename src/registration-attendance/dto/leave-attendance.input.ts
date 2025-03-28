import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class LeaveAttendanceInput {
  @Field(() => [Int])
  attendanceIds: number[];
}
