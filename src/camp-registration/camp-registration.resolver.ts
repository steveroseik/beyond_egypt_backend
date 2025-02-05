import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { CampRegistrationService } from './camp-registration.service';
import { CampRegistration } from './entities/camp-registration.entity';
import { CreateCampRegistrationInput } from './dto/create-camp-registration.input';
import { UpdateCampRegistrationInput } from './dto/update-camp-registration.input';

@Resolver(() => CampRegistration)
export class CampRegistrationResolver {
  constructor(private readonly campRegistrationService: CampRegistrationService) {}

  @Mutation(() => CampRegistration)
  createCampRegistration(@Args('createCampRegistrationInput') createCampRegistrationInput: CreateCampRegistrationInput) {
    return this.campRegistrationService.create(createCampRegistrationInput);
  }

  @Query(() => [CampRegistration], { name: 'campRegistration' })
  findAll() {
    return this.campRegistrationService.findAll();
  }

  @Query(() => CampRegistration, { name: 'campRegistration' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.campRegistrationService.findOne(id);
  }

  @Mutation(() => CampRegistration)
  updateCampRegistration(@Args('updateCampRegistrationInput') updateCampRegistrationInput: UpdateCampRegistrationInput) {
    return this.campRegistrationService.update(updateCampRegistrationInput.id, updateCampRegistrationInput);
  }

  @Mutation(() => CampRegistration)
  removeCampRegistration(@Args('id', { type: () => Int }) id: number) {
    return this.campRegistrationService.remove(id);
  }
}
