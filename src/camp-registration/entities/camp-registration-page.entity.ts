import { Field, ObjectType } from '@nestjs/graphql';
import { PaginationResponse } from 'support/page-response.entity';
import { CampRegistration } from './camp-registration.entity';

@ObjectType()
export class CampRegistrationPage extends PaginationResponse {
  @Field(() => [CampRegistration])
  data: CampRegistration[];
}
