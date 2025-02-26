import { Field, ObjectType } from '@nestjs/graphql';
import { PaginationResponse } from 'support/page-response.entity';
import { Allergy } from './allergy.entity';

@ObjectType()
export class AllergyPage extends PaginationResponse {
  @Field(() => [Allergy])
  data: Allergy[];
}
