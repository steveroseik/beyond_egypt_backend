import { ParentRelation } from 'support/enums';
import { Column } from 'typeorm';
import { CreateChildInput } from './create-child.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateChildInput {
  @Field()
  id: number;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  birthdate?: Date;

  @Field({ nullable: true })
  schoolId?: number;

  @Field({ nullable: true })
  schoolName?: string;

  @Field({ nullable: true })
  imageId?: number;

  @Field({ nullable: true })
  canTakePhotos: boolean;

  @Field({ nullable: true })
  isMale?: boolean;

  @Field(() => ParentRelation, { nullable: true })
  parentRelation?: ParentRelation;

  @Field({ nullable: true })
  imageFileId?: number;

  @Field({ nullable: true })
  medicalInfo?: string;

  @Field({ nullable: true })
  otherAllergies?: string;

  @Field({ nullable: true })
  extraNotes?: string;

  @Field(() => [Int], { nullable: true, defaultValue: [] })
  allergies: number[];
}
