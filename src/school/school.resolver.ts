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
dotenv.config();

@Resolver(() => School)
export class SchoolResolver {
  constructor(private readonly schoolService: SchoolService) {}

  @Mutation(() => School)
  createSchool(
    @Args('createSchoolInput') createSchoolInput: CreateSchoolInput,
  ) {
    return this.schoolService.create(createSchoolInput);
  }

  @Query(() => [School], { name: 'school' })
  findAll() {
    return this.schoolService.findAll();
  }

  @Query(() => School, { name: 'school' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.schoolService.findOne(id);
  }

  @Mutation(() => School)
  updateSchool(
    @Args('updateSchoolInput') updateSchoolInput: UpdateSchoolInput,
  ) {
    return this.schoolService.update(updateSchoolInput.id, updateSchoolInput);
  }

  @Mutation(() => School)
  removeSchool(@Args('id', { type: () => Int }) id: number) {
    return this.schoolService.remove(id);
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
