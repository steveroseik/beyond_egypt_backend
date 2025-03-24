import { Field, ObjectType } from '@nestjs/graphql';
import { CampVariantRegistration } from 'src/camp-variant-registration/entities/camp-variant-registration.entity';
import { Camp } from 'src/camp/entities/camp.entity';
import { PaginationResponse } from 'support/page-response.entity';

@ObjectType()
export class CampVariantsRegistrationPage extends PaginationResponse {
  @Field(() => [CampVariantRegistration])
  data: CampVariantRegistration[];
}
