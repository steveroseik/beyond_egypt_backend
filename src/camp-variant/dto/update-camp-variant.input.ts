import { CreateCampVariantInput } from './create-camp-variant.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateCampVariantInput extends PartialType(CreateCampVariantInput) {
  @Field(() => Int)
  id: number;
}
