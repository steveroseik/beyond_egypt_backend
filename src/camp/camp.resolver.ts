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
import { CampService } from './camp.service';
import { Camp } from './entities/camp.entity';
import { CreateCampInput } from './dto/create-camp.input';
import { UpdateCampInput } from './dto/update-camp.input';
import { CampPage } from './entities/camp-page.entity';
import { PaginateCampsInput } from './dto/paginate-camps.input';
import { Meal } from 'src/meal/entities/meal.entity';
import { DataloaderRegistry } from 'src/dataloaders/dataloaderRegistry';
import { File } from 'src/file/entities/file.entity';
import { GraphQLJSONObject } from 'graphql-type-json';
import { CampVariant } from 'src/camp-variant/entities/camp-variant.entity';
import { Location } from 'src/location/entities/location.entity';
import { Public } from 'src/auth/decorators/publicDecorator';
import { CampRegistration } from 'src/camp-registration/entities/camp-registration.entity';
import { CurrentUser } from 'src/auth/decorators/currentUserDecorator';
import { UserType } from 'support/enums';
import { Event } from 'src/event/entities/event.entity';
import { AgeRange } from 'src/age-range/entities/age-range.entity';
import { Discount } from 'src/discount/entities/discount.entity';

@Resolver(() => Camp)
export class CampResolver {
  constructor(private readonly campService: CampService) {}

  @Mutation(() => GraphQLJSONObject)
  createCamp(@Args('input') input: CreateCampInput) {
    return this.campService.create(input);
  }

  @Public()
  @Query(() => Camp)
  findOneCamp(@Args('id', { type: () => Int }) id: number) {
    return this.campService.findOne(id);
  }

  @Mutation(() => GraphQLJSONObject)
  updateCamp(
    @Args('input') input: UpdateCampInput,
    @CurrentUser('type') type: UserType,
  ) {
    if (type !== UserType.admin) {
      return {
        success: false,
        message: 'You are not authorized to perform this action',
      };
    }
    return this.campService.update(input);
  }

  @Mutation(() => GraphQLJSONObject)
  removeCamp(@Args('id', { type: () => Int }) id: number) {
    return this.campService.remove(id);
  }

  @Public()
  @Query(() => CampPage)
  paginateCamps(@Args('input') input: PaginateCampsInput) {
    return this.campService.paginate(input);
  }

  // @ResolveField(() => [Meal], { nullable: true })
  // meals(
  //   @Parent() parent: Camp,
  //   @Context() { loaders }: { loaders: DataloaderRegistry },
  // ) {
  //   return parent.meals ?? loaders.MealsLoader.load(parent.id);
  // }

  @ResolveField(() => File)
  thumbnail(
    @Parent() parent: Camp,
    @Context() { loaders }: { loaders: DataloaderRegistry },
  ) {
    return loaders.FilesLoader.load(parent.thumbnailId);
  }

  @ResolveField(() => [CampVariant])
  campVariants(
    @Parent() parent: Camp,
    @Context() { loaders }: { loaders: DataloaderRegistry },
  ) {
    return parent.campVariants?.length
      ? parent.campVariants
      : loaders.CampVariantsByCampDataLoader.load(parent.id);
  }

  @ResolveField(() => [File])
  files(
    @Parent() parent: Camp,
    @Context() { loaders }: { loaders: DataloaderRegistry },
  ) {
    return loaders.CampFilesDataLoader.load(parent.id);
  }

  @ResolveField(() => Location)
  location(
    @Parent() parent: Camp,
    @Context() { loaders }: { loaders: DataloaderRegistry },
  ) {
    return loaders.LocationsLoader.load(parent.locationId);
  }

  @ResolveField(() => CampRegistration, { nullable: true })
  parentCampRegistration(
    @Parent() parent: Camp,
    @Args('parentId', { nullable: true }) parentId?: string,
  ) {
    return parentId
      ? this.campService.findLatestCampRegistration(parentId, parent.id)
      : null;
  }

  @ResolveField(() => Event, { nullable: true })
  event(
    @Parent() parent: Camp,
    @Context() { loaders }: { loaders: DataloaderRegistry },
  ) {
    return parent.eventId
      ? (parent.event ?? loaders.EventsDataLoader.load(parent.eventId))
      : null;
  }

  @ResolveField(() => [AgeRange], { nullable: true })
  ageRanges(
    @Parent() parent: Camp,
    @Context() { loaders }: { loaders: DataloaderRegistry },
  ) {
    return parent.ageRanges?.length
      ? parent.ageRanges
      : loaders.AgeRangesByCampDataLoader.load(parent.id);
  }

  @ResolveField(() => Discount, { nullable: true })
  discount(
    @Parent() parent: Camp,
    @Context() { loaders }: { loaders: DataloaderRegistry },
  ) {
    return parent.discountId
      ? (parent.discountId ??
          loaders.DiscountsDataLoader.load(parent.discountId))
      : null;
  }
}
