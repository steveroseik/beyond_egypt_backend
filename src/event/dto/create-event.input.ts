import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreateEventInput {
  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  thumbnailId: number;

  @Field()
  startDate: Date;

  @Field()
  endDate: Date;

  @Field({ nullable: true })
  earlyBirdId?: number;

  @Field(() => [Int], { nullable: true })
  fileIds?: number[];
}
