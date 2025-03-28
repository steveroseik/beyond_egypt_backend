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
import { CampRegistrationService } from './camp-registration.service';
import { CampRegistration } from './entities/camp-registration.entity';
import { CreateCampRegistrationInput } from './dto/create-camp-registration.input';
import { UpdateCampRegistrationInput } from './dto/update-camp-registration.input';
import { CurrentUser } from 'src/auth/decorators/currentUserDecorator';
import { UserType } from 'support/enums';
import { GraphQLJSONObject } from 'graphql-type-json';
import { CampRegistrationPage } from './entities/camp-registration-page.entity';
import { PaginateCampRegistrationsInput } from './dto/paginate-camp-registrations.input';
import { ProcessCampRegistrationInput } from './dto/process-camp-registration.input';
import { CampVariantRegistration } from 'src/camp-variant-registration/entities/camp-variant-registration.entity';
import { DataloaderRegistry } from 'src/dataloaders/dataloaderRegistry';
import { Camp } from 'src/camp/entities/camp.entity';
import { User } from 'src/user/entities/user.entity';

@Resolver(() => CampRegistration)
export class CampRegistrationResolver {
  constructor(
    private readonly campRegistrationService: CampRegistrationService,
  ) {}

  @Mutation(() => GraphQLJSONObject)
  createCampRegistration(
    @Args('input') input: CreateCampRegistrationInput,
    @CurrentUser('type') type: UserType,
    @CurrentUser('id') id: string,
  ) {
    if (type === UserType.parent) {
      input.parentId = id;
      if (
        input.campVariantRegistrations?.length ||
        input.paidAmount ||
        input.oneDayPrice ||
        input.paymentMethod
      ) {
        return {
          success: false,
          message: 'Unauthorized, admin actions done by parent',
        };
      }
    }

    return this.campRegistrationService.create(input, type, id);
  }

  @Query(() => CampRegistration, { name: 'campRegistration' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.campRegistrationService.findOne(id);
  }

  @Mutation(() => GraphQLJSONObject)
  completeCampRegistration(
    @Args('input')
    input: UpdateCampRegistrationInput,
    @CurrentUser('id') userId: string,
    @CurrentUser('type') type: UserType,
  ) {
    return this.campRegistrationService.completeCampRegistration(
      input,
      userId,
      type,
    );
  }

  @Mutation(() => CampRegistration)
  removeCampRegistration(@Args('id', { type: () => Int }) id: number) {
    return this.campRegistrationService.remove(id);
  }

  @Query(() => CampRegistrationPage)
  paginateCampRegistrations(
    @Args('input') input: PaginateCampRegistrationsInput,
    @CurrentUser('type') type: UserType,
    @CurrentUser('id') id: string,
  ) {
    if (type == UserType.parent) {
      input.parentIds = [id];
    }
    return this.campRegistrationService.paginateCampRegistrations(input);
  }

  @Mutation(() => GraphQLJSONObject)
  processCampRegistration(
    @Args('input') input: ProcessCampRegistrationInput,
    @CurrentUser('id') userId: string,
    @CurrentUser('type') type: UserType,
  ) {
    return this.campRegistrationService.processCampRegistration(
      input,
      userId,
      type,
    );
  }

  @ResolveField(() => [CampVariantRegistration], { nullable: true })
  campVariantRegistrations(
    @Parent() campRegistration: CampRegistration,
    @Context() { loaders }: { loaders: DataloaderRegistry },
  ) {
    return (
      campRegistration.campVariantRegistrations ??
      loaders.CampVariantRegistrationsDataLoader.load(campRegistration.id)
    );
  }

  @ResolveField(() => Camp, { nullable: true })
  camp(
    @Parent() campRegistration: CampRegistration,
    @Context() { loaders }: { loaders: DataloaderRegistry },
  ) {
    return loaders.CampsDataLoader.load(campRegistration.campId);
  }

  @ResolveField(() => User)
  parent(
    @Parent() campRegistration: CampRegistration,
    @Context() { loaders }: { loaders: DataloaderRegistry },
  ) {
    return loaders.UsersDataLoader.load(campRegistration.parentId);
  }
}
