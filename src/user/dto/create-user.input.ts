import { InputType, Int, Field } from '@nestjs/graphql';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';
import { CreateChildInput } from 'src/child/dto/create-child.input';
import { CreateParentAdditionalInput } from 'src/parent-additional/dto/create-parent-additional.input';
import { UserType } from 'support/enums';

@InputType()
export class CreateUserInput {
  id: string;

  @Field({ nullable: true })
  firebaseToken?: string;

  @Field()
  name: string;

  @Field(() => UserType)
  type: UserType;

  @Field()
  email: string;

  @Field({ nullable: true })
  phone?: string;

  @Field({ nullable: true })
  emergencyPhone?: string;

  @Field({ nullable: true })
  district?: string;

  @Field(() => [CreateParentAdditionalInput], { nullable: true })
  parentAdditional?: CreateParentAdditionalInput[];

  @Field(() => [CreateChildInput], { nullable: true })
  children?: CreateChildInput[];
}
