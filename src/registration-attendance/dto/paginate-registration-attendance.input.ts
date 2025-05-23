import { InputType } from '@nestjs/graphql';
import { PaginationInput } from 'support/pagination.input';

@InputType()
export class PaginateRegistrationAttendanceInput extends PaginationInput {}
