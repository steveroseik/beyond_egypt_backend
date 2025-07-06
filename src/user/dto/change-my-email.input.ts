import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty } from 'class-validator';

@InputType()
export class ChangeMyEmailInput {
  @Field()
  @IsEmail()
  @IsNotEmpty()
  newEmail: string;
} 