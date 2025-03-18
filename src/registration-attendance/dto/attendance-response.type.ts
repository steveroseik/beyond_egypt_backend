import { Field, ObjectType } from '@nestjs/graphql';
import { RegistrationAttendance } from '../entities/registration-attendance.entity';

@ObjectType()
export class AttendanceResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field(() => RegistrationAttendance, { nullable: true })
  data?: RegistrationAttendance;
}
