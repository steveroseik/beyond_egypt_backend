import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class PaginationInput {
  @Field(() => Boolean, { defaultValue: false })
  isAsc: boolean;

  @Field(() => Int, { defaultValue: 20, nullable: true })
  limit?: number;

  @Field({ nullable: true })
  afterCursor?: string;

  @Field({ nullable: true })
  beforeCursor?: string;
}
