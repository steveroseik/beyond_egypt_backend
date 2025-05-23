import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { RegistrationAttendanceService } from './registration-attendance.service';
import { RegistrationAttendance } from './entities/registration-attendance.entity';
import { CreateRegistrationAttendanceInput } from './dto/create-registration-attendance.input';
import { UseGuards } from '@nestjs/common';
// import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
// import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { AttendanceResponse } from './dto/attendance-response.type';
import { CurrentUser } from 'src/auth/decorators/currentUserDecorator';
import { UserType } from 'support/enums';
import { GraphQLJSONObject } from 'graphql-type-json';
import { RegistrationAttendancePage } from './entities/registration-attendance-page.entity';
import { PaginateRegistrationAttendanceInput } from './dto/paginate-registration-attendance.input';

@Resolver(() => RegistrationAttendance)
// @UseGuards(GqlAuthGuard)
export class RegistrationAttendanceResolver {
  constructor(private readonly service: RegistrationAttendanceService) {}

  @Mutation(() => GraphQLJSONObject, { name: 'enterAttendance' })
  async enter(
    @Args('input') input: CreateRegistrationAttendanceInput,
    @CurrentUser('id') userId: string,
    @CurrentUser('type') type: UserType,
  ) {
    if (type !== UserType.admin) {
      return {
        message: 'Unauthorized, only admins can enter attendance',
        success: false,
      };
    }
    const existingCampVariant = await this.service.checkCampVariant(
      input.campVariantId,
    );
    if (!existingCampVariant) {
      return {
        message: 'Camp variant not found',
        success: false,
      };
    }

    const existingChild = await this.service.checkChild(input.childId);
    if (!existingChild) {
      return {
        message: 'Child not found',
        success: false,
      };
    }
    return this.service.enter(input, userId);
  }

  @Mutation(() => GraphQLJSONObject, { name: 'leaveAttendance' })
  async leave(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser('id') userId: string,
    @CurrentUser('type') type: UserType,
  ) {
    if (type !== UserType.admin) {
      return {
        message: 'Unauthorized, only admins can record leave',
        success: false,
      };
    }

    const existingAttendance = await this.service.findActiveAttendanceById(id);
    if (!existingAttendance) {
      return {
        message: 'No active attendance record found',
        success: false,
      };
    }

    return this.service.leave(id, userId);
  }

  @Query(() => RegistrationAttendancePage)
  paginateRegistrationAttendance(
    @Args('input') input: PaginateRegistrationAttendanceInput,
  ) {
    return this.service.paginate(input);
  }
}
