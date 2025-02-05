import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { CampVariantRegistrationService } from './camp-variant-registration.service';
import { CampVariantRegistration } from './entities/camp-variant-registration.entity';
import { CreateCampVariantRegistrationInput } from './dto/create-camp-variant-registration.input';
import { UpdateCampVariantRegistrationInput } from './dto/update-camp-variant-registration.input';

@Resolver(() => CampVariantRegistration)
export class CampVariantRegistrationResolver {
  constructor(private readonly campVariantRegistrationService: CampVariantRegistrationService) {}

  @Mutation(() => CampVariantRegistration)
  createCampVariantRegistration(@Args('createCampVariantRegistrationInput') createCampVariantRegistrationInput: CreateCampVariantRegistrationInput) {
    return this.campVariantRegistrationService.create(createCampVariantRegistrationInput);
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
  updateCampVariantRegistration(@Args('updateCampVariantRegistrationInput') updateCampVariantRegistrationInput: UpdateCampVariantRegistrationInput) {
    return this.campVariantRegistrationService.update(updateCampVariantRegistrationInput.id, updateCampVariantRegistrationInput);
  }

  @Mutation(() => CampVariantRegistration)
  removeCampVariantRegistration(@Args('id', { type: () => Int }) id: number) {
    return this.campVariantRegistrationService.remove(id);
  }
}
