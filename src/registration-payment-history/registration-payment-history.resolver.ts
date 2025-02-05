import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { RegistrationPaymentHistoryService } from './registration-payment-history.service';
import { RegistrationPaymentHistory } from './entities/registration-payment-history.entity';
import { CreateRegistrationPaymentHistoryInput } from './dto/create-registration-payment-history.input';
import { UpdateRegistrationPaymentHistoryInput } from './dto/update-registration-payment-history.input';

@Resolver(() => RegistrationPaymentHistory)
export class RegistrationPaymentHistoryResolver {
  constructor(private readonly registrationPaymentHistoryService: RegistrationPaymentHistoryService) {}

  @Mutation(() => RegistrationPaymentHistory)
  createRegistrationPaymentHistory(@Args('createRegistrationPaymentHistoryInput') createRegistrationPaymentHistoryInput: CreateRegistrationPaymentHistoryInput) {
    return this.registrationPaymentHistoryService.create(createRegistrationPaymentHistoryInput);
  }

  @Query(() => [RegistrationPaymentHistory], { name: 'registrationPaymentHistory' })
  findAll() {
    return this.registrationPaymentHistoryService.findAll();
  }

  @Query(() => RegistrationPaymentHistory, { name: 'registrationPaymentHistory' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.registrationPaymentHistoryService.findOne(id);
  }

  @Mutation(() => RegistrationPaymentHistory)
  updateRegistrationPaymentHistory(@Args('updateRegistrationPaymentHistoryInput') updateRegistrationPaymentHistoryInput: UpdateRegistrationPaymentHistoryInput) {
    return this.registrationPaymentHistoryService.update(updateRegistrationPaymentHistoryInput.id, updateRegistrationPaymentHistoryInput);
  }

  @Mutation(() => RegistrationPaymentHistory)
  removeRegistrationPaymentHistory(@Args('id', { type: () => Int }) id: number) {
    return this.registrationPaymentHistoryService.remove(id);
  }
}
