import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { RegistrationAttendanceService } from './registration-attendance.service';
import { RegistrationAttendance } from './entities/registration-attendance.entity';
import { CreateRegistrationAttendanceInput } from './dto/create-registration-attendance.input';
import { LeaveAttendanceInput } from './dto/leave-attendance.input';
import { UseGuards } from '@nestjs/common';
// import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
// import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { AttendanceResponse } from './dto/attendance-response.type';
import { CurrentUser } from 'src/auth/decorators/currentUserDecorator';
import { UserType } from 'support/enums';
import { GraphQLJSONObject } from 'graphql-type-json';

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

    // Check all children exist
    for (const childId of input.childIds) {
      const existingChild = await this.service.checkChild(childId);
      if (!existingChild) {
        return {
          message: `Child with ID ${childId} not found`,
          success: false,
        };
      }
    }

    return this.service.enter(input, userId);
  }

  @Mutation(() => GraphQLJSONObject, { name: 'leaveAttendance' })
  async leave(
    @Args('input') input: LeaveAttendanceInput,
    @CurrentUser('id') userId: string,
    @CurrentUser('type') type: UserType,
  ) {
    if (type !== UserType.admin) {
      return {
        message: 'Unauthorized, only admins can record leave',
        success: false,
      };
    }

    return this.service.leave(input.attendanceIds, userId);
  }
}
