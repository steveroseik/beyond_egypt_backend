import { CreateEventFileInput } from './create-event-file.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateEventFileInput extends PartialType(CreateEventFileInput) {
  @Field(() => Int)
  id: number;
}
