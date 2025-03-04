import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { RegistrationPaymentHistoryService } from './registration-payment.service';
import { RegistrationPayment } from './entities/registration-payment.entity';
import { CreateRegistrationPaymentHistoryInput } from './dto/create-registration-payment.input';
import { UpdateRegistrationPaymentHistoryInput } from './dto/update-registration-payment.input';

@Resolver(() => RegistrationPayment)
export class RegistrationPaymentHistoryResolver {
  constructor(
    private readonly registrationPaymentHistoryService: RegistrationPaymentHistoryService,
  ) {}

  @Mutation(() => RegistrationPayment)
  createRegistrationPaymentHistory(
    @Args('createRegistrationPaymentHistoryInput')
    createRegistrationPaymentHistoryInput: CreateRegistrationPaymentHistoryInput,
  ) {
    return this.registrationPaymentHistoryService.create(
      createRegistrationPaymentHistoryInput,
    );
  }

  @Query(() => [RegistrationPayment], { name: 'registrationPaymentHistory' })
  findAll() {
    return this.registrationPaymentHistoryService.findAll();
  }

  @Query(() => RegistrationPayment, { name: 'registrationPaymentHistory' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.registrationPaymentHistoryService.findOne(id);
  }

  @Mutation(() => RegistrationPayment)
  updateRegistrationPaymentHistory(
    @Args('updateRegistrationPaymentHistoryInput')
    updateRegistrationPaymentHistoryInput: UpdateRegistrationPaymentHistoryInput,
  ) {
    return this.registrationPaymentHistoryService.update(
      updateRegistrationPaymentHistoryInput.id,
      updateRegistrationPaymentHistoryInput,
    );
  }

  @Mutation(() => RegistrationPayment)
  removeRegistrationPaymentHistory(
    @Args('id', { type: () => Int }) id: number,
  ) {
    return this.registrationPaymentHistoryService.remove(id);
  }
}
