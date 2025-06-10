import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ResolveField,
  Parent,
  Context,
} from '@nestjs/graphql';
import { ChildReportService } from './child-report.service';
import { ChildReport } from './entities/child-report.entity';
import { CreateChildReportInput } from './dto/create-child-report.input';
import { UpdateChildReportInput } from './dto/update-child-report.input';
import { GraphQLJSONObject } from 'graphql-type-json';
import { ChildReportStatus, UserType } from 'support/enums';
import { ChildReportPage } from './entities/child-report-page.entity';
import { PaginateChildReportsInput } from './dto/paginate-child-reports.input';
import { CurrentUser } from 'src/auth/decorators/currentUserDecorator';
import { DataloaderRegistry } from 'src/dataloaders/dataloaderRegistry';
import { ChildReportHistory } from 'src/child-report-history/entities/child-report-history.entity';
import { Child } from 'src/child/entities/child.entity';
import { CampVariant } from 'src/camp-variant/entities/camp-variant.entity';

@Resolver(() => ChildReport)
export class ChildReportResolver {
  constructor(private readonly childReportService: ChildReportService) {}

  @Mutation(() => GraphQLJSONObject)
  createChildReport(
    @Args('input') input: CreateChildReportInput,
    @CurrentUser('id') userId: string,
  ) {
    input.details.reporterId = userId;
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

  @Query(() => ChildReportPage)
  paginateChildReports(
    @Args('input') input: PaginateChildReportsInput,
    @CurrentUser('type') userType: UserType,
    @CurrentUser('id') userId: string,
  ) {
    return this.childReportService.paginate(input, userType, userId);
  }

  @ResolveField(() => ChildReportHistory, { nullable: true })
  latestReportHistory(
    @Parent() childReport: ChildReport,
    @Context() { loaders }: { loaders: DataloaderRegistry },
  ) {
    return loaders.latestChildReportHistoryDataLoader.load(childReport.id);
  }

  @ResolveField(() => Child)
  child(
    @Parent() childReport: ChildReport,
    @Context() { loaders }: { loaders: DataloaderRegistry },
  ) {
    return (
      childReport.child ?? loaders.ChildDataLoader.load(childReport.childId)
    );
  }

  @ResolveField(() => CampVariant)
  campVariant(
    @Parent() childReport: ChildReport,
    @Context() { loaders }: { loaders: DataloaderRegistry },
  ) {
    return (
      childReport.campVariant ??
      loaders.CampVariantsDataLoader.load(childReport.campVariantId)
    );
  }
}
