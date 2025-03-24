import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  Parent,
  ResolveField,
} from '@nestjs/graphql';
import { RegistrationPaymentHistoryService } from './registration-payment.service';
import { RegistrationPayment } from './entities/registration-payment.entity';
import { CreateRegistrationPaymentHistoryInput } from './dto/create-registration-payment.input';
import { UpdateRegistrationPaymentHistoryInput } from './dto/update-registration-payment.input';
import * as dotenv from 'dotenv';
dotenv.config();

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

  @ResolveField(() => String)
  receipt(@Parent() payment: RegistrationPayment) {
    return payment.receipt
      ? `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${payment.receipt}`
      : null;
  }
}
