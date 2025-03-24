import { InputType, Int, Field } from '@nestjs/graphql';
import { Base64Image } from 'support/shared/base64Image.object';

@InputType()
export class CreateSchoolInput {
  @Field()
  nameEn: string;

  @Field()
  nameAr: string;

  @Field(() => Base64Image, { nullable: true })
  base64Image?: Base64Image;
}
