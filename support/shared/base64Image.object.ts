import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class Base64Image {
  @Field()
  base64: string;

  @Field()
  name: string;
}
