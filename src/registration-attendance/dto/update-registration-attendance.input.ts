import { CreateRegistrationAttendanceInput } from './create-registration-attendance.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateRegistrationAttendanceInput extends PartialType(CreateRegistrationAttendanceInput) {
  @Field(() => Int)
  id: number;
}
