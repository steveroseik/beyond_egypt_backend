import { Field, ObjectType } from '@nestjs/graphql';
import { PaginationResponse } from 'support/page-response.entity';
import { RegistrationAttendance } from './registration-attendance.entity';

@ObjectType()
export class RegistrationAttendancePage extends PaginationResponse {
  @Field(() => [RegistrationAttendance])
  data: RegistrationAttendance[];
}
