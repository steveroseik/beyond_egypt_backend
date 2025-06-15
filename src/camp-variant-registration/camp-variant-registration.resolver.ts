import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ResolveField,
  Context,
  Parent,
} from '@nestjs/graphql';
import { CampVariantRegistrationService } from './camp-variant-registration.service';
import { CampVariantRegistration } from './entities/camp-variant-registration.entity';
import { CreateCampVariantRegistrationInput } from './dto/create-camp-variant-registration.input';
import { UpdateCampVariantRegistrationInput } from './dto/update-camp-variant-registration.input';
import { Child } from 'src/child/entities/child.entity';
import { DataloaderRegistry } from 'src/dataloaders/dataloaderRegistry';
import { CampVariant } from 'src/camp-variant/entities/camp-variant.entity';
import { CampVariantsRegistrationPage } from './entities/camp-variant-registration-page.entity';
import { PaginateCampVariantRegistrationsInput } from './dto/paginate-camp-variant-registrations.input';

@Resolver(() => CampVariantRegistration)
export class CampVariantRegistrationResolver {
  constructor(
    private readonly campVariantRegistrationService: CampVariantRegistrationService,
  ) {}

  @Mutation(() => CampVariantRegistration)
  createCampVariantRegistration(
    @Args('createCampVariantRegistrationInput')
    createCampVariantRegistrationInput: CreateCampVariantRegistrationInput,
  ) {
    return this.campVariantRegistrationService.create(
      createCampVariantRegistrationInput,
    );
  }

  @Query(() => [CampVariantRegistration], { name: 'campVariantRegistration' })
  findAll() {
    return this.campVariantRegistrationService.findAll();
  }

  @Query(() => CampVariantRegistration, { name: 'campVariantRegistration' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.campVariantRegistrationService.findOne(id);
  }

  @Mutation(() => CampVariantRegistration)
  updateCampVariantRegistration(
    @Args('updateCampVariantRegistrationInput')
    updateCampVariantRegistrationInput: UpdateCampVariantRegistrationInput,
  ) {
    return this.campVariantRegistrationService.update(
      updateCampVariantRegistrationInput.id,
      updateCampVariantRegistrationInput,
    );
  }

  @Mutation(() => CampVariantRegistration)
  removeCampVariantRegistration(@Args('id', { type: () => Int }) id: number) {
    return this.campVariantRegistrationService.remove(id);
  }

  @Query(() => CampVariantsRegistrationPage)
  paginateCampVariantRegistrations(
    @Args('input') input: PaginateCampVariantRegistrationsInput,
  ) {
    return this.campVariantRegistrationService.paginate(input);
  }
  @ResolveField(() => Child)
  child(
    @Parent() campVariantRegistration: CampVariantRegistration,
    @Context() { loaders }: { loaders: DataloaderRegistry },
  ) {
    return loaders.ChildDataLoader.load(campVariantRegistration.childId);
  }

  @ResolveField(() => CampVariant)
  campVariant(
    @Parent() campVariantRegistration: CampVariantRegistration,
    @Context() { loaders }: { loaders: DataloaderRegistry },
  ) {
    return loaders
      .CampVariantsDataLoader({ withDeleted: true })
      .load(campVariantRegistration.campVariantId);
  }
}
