import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLScalarType } from 'graphql';

@ObjectType()
export class ResponseWrapper<T> {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { defaultValue: 'Request successful' })
  message: string;

  @Field(() => GraphQLScalarType, { nullable: true })
  data?: T;

  constructor(data?: T, message: string = 'Request successful') {
    this.success = true;
    this.message = message;
    this.data = data;
  }
}
