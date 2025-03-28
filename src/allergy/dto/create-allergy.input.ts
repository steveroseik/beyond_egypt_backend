import { InputType, Int, Field } from '@nestjs/graphql';
import { AllergyCategory } from 'support/enums';

@InputType()
export class CreateAllergyInput {
  @Field()
  nameEn: string;

  @Field()
  nameAr: string;

  @Field(() => AllergyCategory)
  category: AllergyCategory;
}
