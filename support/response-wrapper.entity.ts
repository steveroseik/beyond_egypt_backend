import { Type } from '@nestjs/common';
import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLScalarType } from 'graphql';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';

@ObjectType()
export class ResponseWrapper<T> {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { defaultValue: 'Request successful' })
  message: string;

  @Field(() => GraphQLJSONObject, { nullable: true })
  data?: T;

  constructor(data?: T, message: string = 'Request successful') {
    this.success = true;
    this.message = message;
    this.data = data;
  }
}
