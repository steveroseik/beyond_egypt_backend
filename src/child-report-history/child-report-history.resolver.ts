import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { ChildReportHistoryService } from './child-report-history.service';
import { ChildReportHistory } from './entities/child-report-history.entity';
import { CreateChildReportHistoryInput } from './dto/create-child-report-history.input';
import { UpdateChildReportHistoryInput } from './dto/update-child-report-history.input';
import { ChildReportHistoryPage } from './entities/child-report-history-page.entity';
import { PaginateChildReportHistoryInput } from './dto/paginate-child-report-history.input';
import { CurrentUser } from 'src/auth/decorators/currentUserDecorator';

@Resolver(() => ChildReportHistory)
export class ChildReportHistoryResolver {
  constructor(
    private readonly childReportHistoryService: ChildReportHistoryService,
  ) {}

  @Mutation(() => ChildReportHistory)
  createChildReportHistory(
    @Args('input') input: CreateChildReportHistoryInput,
    @CurrentUser('id') userId: string,
  ) {
    input.reporterId = userId;
    return this.childReportHistoryService.create(input);
  }

  // @Query(() => [ChildReportHistory], { name: 'childReportHistory' })
  // findAll() {
  //   return this.childReportHistoryService.findAll();
  // }

  @Query(() => ChildReportHistory, { name: 'childReportHistory' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.childReportHistoryService.findOne(id);
  }

  // @Mutation(() => ChildReportHistory)
  // updateChildReportHistory(
  //   @Args('updateChildReportHistoryInput')
  //   updateChildReportHistoryInput: UpdateChildReportHistoryInput,

  // ) {

  //   return this.childReportHistoryService.update(
  //     updateChildReportHistoryInput.id,
  //     updateChildReportHistoryInput,
  //   );
  // }

  // @Mutation(() => ChildReportHistory)
  // removeChildReportHistory(@Args('id', { type: () => Int }) id: number) {
  //   return this.childReportHistoryService.remove(id);
  // }

  // @Query(() => ChildReportHistoryPage)
  // paginateChildReportHistory(
  //   @Args('input') input: PaginateChildReportHistoryInput,
  // ) {
  //   return this.childReportHistoryService.paginate(input);
  // }
}
