import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { RegistrationHistoryService } from './registration-history.service';
import { RegistrationHistory } from './entities/registration-history.entity';
import { CreateRegistrationHistoryInput } from './dto/create-registration-history.input';
import { UpdateRegistrationHistoryInput } from './dto/update-registration-history.input';

@Resolver(() => RegistrationHistory)
export class RegistrationHistoryResolver {
  constructor(private readonly registrationHistoryService: RegistrationHistoryService) {}

  @Mutation(() => RegistrationHistory)
  createRegistrationHistory(@Args('createRegistrationHistoryInput') createRegistrationHistoryInput: CreateRegistrationHistoryInput) {
    return this.registrationHistoryService.create(createRegistrationHistoryInput);
  }

  @Query(() => [RegistrationHistory], { name: 'registrationHistory' })
  findAll() {
    return this.registrationHistoryService.findAll();
  }

  @Query(() => RegistrationHistory, { name: 'registrationHistory' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.registrationHistoryService.findOne(id);
  }

  @Mutation(() => RegistrationHistory)
  updateRegistrationHistory(@Args('updateRegistrationHistoryInput') updateRegistrationHistoryInput: UpdateRegistrationHistoryInput) {
    return this.registrationHistoryService.update(updateRegistrationHistoryInput.id, updateRegistrationHistoryInput);
  }

  @Mutation(() => RegistrationHistory)
  removeRegistrationHistory(@Args('id', { type: () => Int }) id: number) {
    return this.registrationHistoryService.remove(id);
  }
}
