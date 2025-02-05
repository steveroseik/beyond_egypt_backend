import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { ChildReportService } from './child-report.service';
import { ChildReport } from './entities/child-report.entity';
import { CreateChildReportInput } from './dto/create-child-report.input';
import { UpdateChildReportInput } from './dto/update-child-report.input';

@Resolver(() => ChildReport)
export class ChildReportResolver {
  constructor(private readonly childReportService: ChildReportService) {}

  @Mutation(() => ChildReport)
  createChildReport(@Args('createChildReportInput') createChildReportInput: CreateChildReportInput) {
    return this.childReportService.create(createChildReportInput);
  }

  @Query(() => [ChildReport], { name: 'childReport' })
  findAll() {
    return this.childReportService.findAll();
  }

  @Query(() => ChildReport, { name: 'childReport' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.childReportService.findOne(id);
  }

  @Mutation(() => ChildReport)
  updateChildReport(@Args('updateChildReportInput') updateChildReportInput: UpdateChildReportInput) {
    return this.childReportService.update(updateChildReportInput.id, updateChildReportInput);
  }

  @Mutation(() => ChildReport)
  removeChildReport(@Args('id', { type: () => Int }) id: number) {
    return this.childReportService.remove(id);
  }
}
