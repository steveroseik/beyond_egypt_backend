import { InputType, Int, Field } from '@nestjs/graphql';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { ParentRelation } from 'support/enums';
import { Column } from 'typeorm';

@InputType()
export class CreateChildInput {
  parentId: string;

  @IsString()
  @Field()
  name: string;

  @IsDateString()
  @Field()
  birthdate: Date;

  @IsInt()
  @IsOptional()
  @Field({ nullable: true })
  schoolId?: number;

  @IsBoolean()
  @Field()
  isMale: boolean;

  @IsOptional()
  @IsString()
  @Field({ nullable: true })
  schoolName: string;

  @IsString()
  @Field(() => ParentRelation)
  parentRelation: ParentRelation;

  @IsOptional()
  @IsInt()
  @Field({ nullable: true })
  imageFileId?: number;

  @IsOptional()
  @IsString()
  @Field({ nullable: true })
  medicalInfo?: string;

  @IsOptional()
  @IsString()
  @Field({ nullable: true })
  otherAllergies?: string;

  @IsOptional()
  @IsString()
  @Field({ nullable: true })
  extraNotes?: string;

  @IsOptional()
  @IsArray()
  @Field(() => [Int], { nullable: true })
  allergies?: number[];
}
