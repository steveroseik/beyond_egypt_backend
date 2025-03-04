import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { RegistrationReserveService } from './registration-reserve.service';
import { RegistrationReserve } from './entities/registration-reserve.entity';
import { CreateRegistrationReserveInput } from './dto/create-registration-reserve.input';
import { UpdateRegistrationReserveInput } from './dto/update-registration-reserve.input';

@Resolver(() => RegistrationReserve)
export class RegistrationReserveResolver {
  constructor(private readonly registrationReserveService: RegistrationReserveService) {}

  @Mutation(() => RegistrationReserve)
  createRegistrationReserve(@Args('createRegistrationReserveInput') createRegistrationReserveInput: CreateRegistrationReserveInput) {
    return this.registrationReserveService.create(createRegistrationReserveInput);
  }

  @Query(() => [RegistrationReserve], { name: 'registrationReserve' })
  findAll() {
    return this.registrationReserveService.findAll();
  }

  @Query(() => RegistrationReserve, { name: 'registrationReserve' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.registrationReserveService.findOne(id);
  }

  @Mutation(() => RegistrationReserve)
  updateRegistrationReserve(@Args('updateRegistrationReserveInput') updateRegistrationReserveInput: UpdateRegistrationReserveInput) {
    return this.registrationReserveService.update(updateRegistrationReserveInput.id, updateRegistrationReserveInput);
  }

  @Mutation(() => RegistrationReserve)
  removeRegistrationReserve(@Args('id', { type: () => Int }) id: number) {
    return this.registrationReserveService.remove(id);
  }
}
