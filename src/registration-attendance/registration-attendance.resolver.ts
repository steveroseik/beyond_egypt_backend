import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { RegistrationAttendanceService } from './registration-attendance.service';
import { RegistrationAttendance } from './entities/registration-attendance.entity';
import { CreateRegistrationAttendanceInput } from './dto/create-registration-attendance.input';
import { UpdateRegistrationAttendanceInput } from './dto/update-registration-attendance.input';

@Resolver(() => RegistrationAttendance)
export class RegistrationAttendanceResolver {
  constructor(private readonly registrationAttendanceService: RegistrationAttendanceService) {}

  @Mutation(() => RegistrationAttendance)
  createRegistrationAttendance(@Args('createRegistrationAttendanceInput') createRegistrationAttendanceInput: CreateRegistrationAttendanceInput) {
    return this.registrationAttendanceService.create(createRegistrationAttendanceInput);
  }

  @Query(() => [RegistrationAttendance], { name: 'registrationAttendance' })
  findAll() {
    return this.registrationAttendanceService.findAll();
  }

  @Query(() => RegistrationAttendance, { name: 'registrationAttendance' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.registrationAttendanceService.findOne(id);
  }

  @Mutation(() => RegistrationAttendance)
  updateRegistrationAttendance(@Args('updateRegistrationAttendanceInput') updateRegistrationAttendanceInput: UpdateRegistrationAttendanceInput) {
    return this.registrationAttendanceService.update(updateRegistrationAttendanceInput.id, updateRegistrationAttendanceInput);
  }

  @Mutation(() => RegistrationAttendance)
  removeRegistrationAttendance(@Args('id', { type: () => Int }) id: number) {
    return this.registrationAttendanceService.remove(id);
  }
}
