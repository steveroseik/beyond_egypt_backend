import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  Parent,
  ResolveField,
  Context,
} from '@nestjs/graphql';
import { RegistrationPaymentService } from './registration-payment.service';
import { RegistrationPayment } from './entities/registration-payment.entity';
import { CreateRegistrationPaymentHistoryInput } from './dto/create-registration-payment.input';
import { UpdateRegistrationPaymentHistoryInput } from './dto/update-registration-payment.input';
import * as dotenv from 'dotenv';
import { RegistrationPaymentsPage } from './entities/registration-payments-page.entity';
import { PaginateRegistrationPaymentsInput } from './dto/paginate-registration-payments.input';
import { User } from 'src/user/entities/user.entity';
import { DataloaderRegistry } from 'src/dataloaders/dataloaderRegistry';
import { CampRegistration } from 'src/camp-registration/entities/camp-registration.entity';
import { GraphQLJSONObject } from 'graphql-type-json';
dotenv.config();

@Resolver(() => RegistrationPayment)
export class RegistrationPaymentResolver {
  constructor(
    private readonly registrationPaymentHistoryService: RegistrationPaymentService,
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

  @Query(() => RegistrationPaymentsPage)
  paginateRegistrationPayments(
    @Args('input') input: PaginateRegistrationPaymentsInput,
  ) {
    return this.registrationPaymentHistoryService.paginate(input);
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

  @Mutation(() => GraphQLJSONObject)
  revalidateFawryPayment(@Args('id', { type: () => Int }) id: number) {
    return this.registrationPaymentHistoryService.revalidate(id);
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

  @ResolveField(() => User, { nullable: true })
  user(
    @Parent() parent: RegistrationPayment,
    @Context() { loaders }: { loaders: DataloaderRegistry },
  ) {
    return parent.userId ? loaders.UsersDataLoader.load(parent.userId) : null;
  }

  @ResolveField(() => CampRegistration)
  campRegistration(
    @Parent() parent: RegistrationPayment,
    @Context() { loaders }: { loaders: DataloaderRegistry },
  ) {
    return parent.campRegistrationId
      ? (parent.campRegistration ??
          loaders.CampRegistrationDataLoader.load(parent.campRegistrationId))
      : null;
  }
}
