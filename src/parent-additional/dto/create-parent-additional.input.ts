import { InputType, Int, Field } from '@nestjs/graphql';
import { IsEmail, IsOptional, IsPhoneNumber, IsString } from 'class-validator';

@InputType()
export class CreateParentAdditionalInput {
  id: string;

  @IsString()
  @Field()
  name: string;

  @IsEmail()
  @IsOptional()
  @Field({ nullable: true })
  email?: string;

  @IsPhoneNumber()
  @Field()
  phone: string;
}
