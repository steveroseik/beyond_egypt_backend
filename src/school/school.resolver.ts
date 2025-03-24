import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { SchoolService } from './school.service';
import { School } from './entities/school.entity';
import { CreateSchoolInput } from './dto/create-school.input';
import { UpdateSchoolInput } from './dto/update-school.input';
import { SchoolPage } from './entities/school-page.entity';
import { PaginateSchoolsInput } from './dto/paginate-schools.input';
import { Public } from 'src/auth/decorators/publicDecorator';
import * as dotenv from 'dotenv';
import { GraphQLJSONObject } from 'graphql-type-json';
dotenv.config();

@Resolver(() => School)
export class SchoolResolver {
  constructor(private readonly schoolService: SchoolService) {}

  @Mutation(() => GraphQLJSONObject)
  createSchool(@Args('input') input: CreateSchoolInput) {
    return this.schoolService.create(input);
  }

  @Query(() => School, { nullable: true })
  findOneSchool(@Args('id', { type: () => Int }) id: number) {
    return this.schoolService.findOne(id);
  }

  @Mutation(() => GraphQLJSONObject)
  updateSchool(@Args('input') input: UpdateSchoolInput) {
    return this.schoolService.update(input);
  }

  @Mutation(() => School)
  removeSchool(@Args('ids', { type: () => [Int] }) ids: number[]) {
    return this.schoolService.remove(ids);
  }

  @Public()
  @Query(() => SchoolPage)
  paginateSchools(@Args('input') input: PaginateSchoolsInput) {
    return this.schoolService.paginateSchools(input);
  }

  @ResolveField(() => String, { nullable: true })
  url(@Parent() school: School) {
    if (!school.imageKey) return null;
    const bucket = process.env.S3_BUCKET_NAME;
    return `https://${bucket}.s3.amazonaws.com/${school.imageKey}`;
  }
}
