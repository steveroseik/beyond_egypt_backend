import { Field, InputType } from '@nestjs/graphql';
import { UpdateLocationInput } from './update-location.input';

@InputType()
export class UpdateLocationsInput {
  @Field(() => [UpdateLocationInput])
  locations: UpdateLocationInput[];
}
