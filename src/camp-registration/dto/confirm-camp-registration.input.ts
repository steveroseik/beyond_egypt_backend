import { Field, InputType } from '@nestjs/graphql';
import { Base64Image } from 'support/shared/base64Image.object';

@InputType()
export class ConfirmCampRegistrationInput {
  @Field()
  id: number;

  @Field(() => Base64Image, { nullable: true })
  receipt?: Base64Image;
}
