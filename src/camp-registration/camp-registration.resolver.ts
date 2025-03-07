import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { CampRegistrationService } from './camp-registration.service';
import { CampRegistration } from './entities/camp-registration.entity';
import { CreateCampRegistrationInput } from './dto/create-camp-registration.input';
import { UpdateCampRegistrationInput } from './dto/update-camp-registration.input';
import { CurrentUser } from 'src/auth/decorators/currentUserDecorator';
import { UserType } from 'support/enums';
import { GraphQLJSONObject } from 'graphql-type-json';

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
        input.totalPrice ||
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

  @Query(() => [CampRegistration], { name: 'campRegistration' })
  findAll() {
    return this.campRegistrationService.findAll();
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
}
