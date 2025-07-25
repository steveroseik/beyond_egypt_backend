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
import { CompleteCampRegistrationInput } from './dto/complete-camp-registration.input';
import { CurrentUser } from 'src/auth/decorators/currentUserDecorator';
import { CampRegistrationStatus, UserType } from 'support/enums';
import { GraphQLJSONObject } from 'graphql-type-json';
import { CampRegistrationPage } from './entities/camp-registration-page.entity';
import { PaginateCampRegistrationsInput } from './dto/paginate-camp-registrations.input';
import { ProcessCampRegistrationInput } from './dto/process-camp-registration.input';
import { CampVariantRegistration } from 'src/camp-variant-registration/entities/camp-variant-registration.entity';
import { DataloaderRegistry } from 'src/dataloaders/dataloaderRegistry';
import { Camp } from 'src/camp/entities/camp.entity';
import { User } from 'src/user/entities/user.entity';
import { UpdateCampRegistrationInput } from './dto/update-camp-registration.input';
import { ConfirmCampRegistrationInput } from './dto/confirm-camp-registration.input';
import { GraphqlDecimal } from 'support/scalars';
import { CampRegistrationRefundOptionsInput } from './dto/camp-registration-refund-options.input';
import { ProcessCampRegistrationRefundInput } from './dto/process-camp-registration-refund.input';
import { CompleteRegistrationRefundInput } from './dto/complete-registration-refund.input';
import { RegistrationPayment } from 'src/registration-payment/entities/registration-payment.entity';

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

  @Query(() => CampRegistration, { nullable: true })
  findOneCampRegistration(@Args('id', { type: () => Int }) id: number) {
    return this.campRegistrationService.findOne(id);
  }

  @Mutation(() => GraphQLJSONObject)
  completeCampRegistration(
    @Args('input')
    input: CompleteCampRegistrationInput,
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
  updateCampRegistration(
    @Args('input') input: UpdateCampRegistrationInput,
    @CurrentUser('type') type: UserType,
  ) {
    if (type === UserType.parent) {
      return {
        success: false,
        message: 'You are not authorized to perform this action',
      };
    }
    return this.campRegistrationService.update(input);
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

  @Mutation(() => GraphQLJSONObject)
  confirmCampRegistration(
    @Args('input') input: ConfirmCampRegistrationInput,
    @CurrentUser('id') userId: string,
    @CurrentUser('type') type: UserType,
  ) {
    if (type === UserType.parent) {
      return {
        success: false,
        message: 'You are not authorized to perform this action',
      };
    }
    return this.campRegistrationService.confirmCampRegistration(input, userId);
  }

  @Mutation(() => GraphQLJSONObject)
  rejectCampRegistration(@Args('id') id: number) {
    return this.campRegistrationService.rejectCampRegistration(id);
  }

  @Query(() => GraphQLJSONObject)
  campRegistrationRefundOptions(
    @Args('input') input: CampRegistrationRefundOptionsInput,
  ) {
    return this.campRegistrationService.campRegistrationRefundOptions(input);
  }

  @Mutation(() => GraphQLJSONObject)
  processCampRegistrationRefund(
    @Args('input') input: ProcessCampRegistrationRefundInput,
    @CurrentUser('id') userId: string,
    @CurrentUser('type') type: UserType,
  ) {
    if (type === UserType.parent) {
      return {
        success: false,
        message: 'You are not authorized to perform this action',
      };
    }
    return this.campRegistrationService.processCampRegistrationRefund(input);
  }

  @Mutation(() => GraphQLJSONObject)
  completeRegistrationRefund(
    @Args('input') input: CompleteRegistrationRefundInput,
  ) {
    return this.campRegistrationService.completeRegistrationRefund(input);
  }

  @Query(() => GraphQLJSONObject)
  validateRegistrationCode(
    @Args('token') token: string,
    @Args('withAttendance') withAttendance: boolean,
  ) {
    return this.campRegistrationService.validateCode(token, withAttendance);
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
    return loaders
      .CampsDataLoader({ withDelete: true })
      .load(campRegistration.campId);
  }

  @ResolveField(() => User)
  parent(
    @Parent() campRegistration: CampRegistration,
    @Context() { loaders }: { loaders: DataloaderRegistry },
  ) {
    return loaders.UsersDataLoader.load(campRegistration.parentId);
  }

  @ResolveField(() => Boolean)
  paid(@Parent() campRegistration: CampRegistration) {
    const diff = campRegistration.amount
      .minus(campRegistration.discountAmount ?? 0)
      .minus(campRegistration.paidAmount ?? 0);

    return campRegistration.amountDifference().isLessThanOrEqualTo(0);
  }

  @ResolveField(() => GraphqlDecimal, { nullable: true })
  amountDifference(@Parent() campRegistration: CampRegistration) {
    return campRegistration.amountDifference();
  }

  @ResolveField(() => String, { nullable: true })
  registrationCode(@Parent() registration: CampRegistration) {
    return registration.status === CampRegistrationStatus.accepted
      ? this.campRegistrationService.getCode(registration)
      : null;
  }

  @ResolveField(() => [RegistrationPayment], { nullable: true })
  pendingPayments(
    @Parent() campRegistration: CampRegistration,
    @Context() { loaders }: { loaders: DataloaderRegistry },
  ) {
    return loaders.pendingRegistrationPaymentsCampRegLoader.load(
      campRegistration.id,
    );
  }

  @Mutation(() => GraphQLJSONObject, { nullable: true })
  async sendTestEmail(@Args('code') code?: string) {
    return this.campRegistrationService.test(code);
  }
}
