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
  @Field()
  @IsString()
  id: string;

  @IsString()
  @Field()
  name: string;

  @IsString()
  @Field(() => UserType)
  type: UserType;

  @IsEmail()
  @Field()
  email: string;

  @IsPhoneNumber()
  @IsOptional()
  @Field({ nullable: true })
  phone?: string;

  @IsString()
  @IsOptional()
  @Field({ nullable: true })
  occupation?: string;

  @IsOptional()
  @Field(() => [CreateParentAdditionalInput], { nullable: true })
  parentAdditional?: CreateParentAdditionalInput[];

  @IsOptional()
  @Field(() => [CreateChildInput], { nullable: true })
  children?: CreateChildInput[];
}
