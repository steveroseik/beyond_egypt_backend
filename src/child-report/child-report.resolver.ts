import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { ChildReportService } from './child-report.service';
import { ChildReport } from './entities/child-report.entity';
import { CreateChildReportInput } from './dto/create-child-report.input';
import { UpdateChildReportInput } from './dto/update-child-report.input';
import { GraphQLJSONObject } from 'graphql-type-json';
import { ChildReportStatus } from 'support/enums';

@Resolver(() => ChildReport)
export class ChildReportResolver {
  constructor(private readonly childReportService: ChildReportService) {}

  @Mutation(() => GraphQLJSONObject)
  createChildReport(@Args('input') input: CreateChildReportInput) {
    return this.childReportService.create(input);
  }

  @Query(() => [ChildReport], { name: 'childReport' })
  findAll() {
    return this.childReportService.findAll();
  }

  @Query(() => ChildReport, { name: 'childReport' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.childReportService.findOne(id);
  }

  @Mutation(() => GraphQLJSONObject)
  updateChildReport(
    @Args('input')
    input: UpdateChildReportInput,
  ) {
    return this.childReportService.update(input);
  }

  @Mutation(() => GraphQLJSONObject)
  closeChildReport(@Args('id', { type: () => Int }) id: number) {
    return this.childReportService.update({
      id,
      status: ChildReportStatus.closed,
    });
  }

  @Mutation(() => GraphQLJSONObject)
  removeChildReport(@Args('id', { type: () => Int }) id: number) {
    return this.childReportService.remove(id);
  }
}
