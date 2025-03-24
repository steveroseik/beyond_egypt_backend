import { InputType, Field, Int } from '@nestjs/graphql';
import { PaginationInput } from 'support/pagination.input';

@InputType()
export class PaginateCampsInput extends PaginationInput {
  @Field({ nullable: true })
  search?: string;

  @Field(() => [Int], { nullable: true })
  eventIds?: number[];

  @Field(() => [Int], { nullable: true })
  locationIds?: number[];
}
