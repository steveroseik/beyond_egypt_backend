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
import { RegistrationAttendanceService } from './registration-attendance.service';
import { RegistrationAttendance } from './entities/registration-attendance.entity';
import { CreateRegistrationAttendanceInput } from './dto/create-registration-attendance.input';
import { UseGuards } from '@nestjs/common';
// import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
// import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { CurrentUser } from 'src/auth/decorators/currentUserDecorator';
import { UserType } from 'support/enums';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import { RegistrationAttendancePage } from './entities/registration-attendance-page.entity';
import { PaginateRegistrationAttendanceInput } from './dto/paginate-registration-attendance.input';
import { CampRegistration } from 'src/camp-registration/entities/camp-registration.entity';
import { DataloaderRegistry } from 'src/dataloaders/dataloaderRegistry';
import { CampVariantRegistration } from 'src/camp-variant-registration/entities/camp-variant-registration.entity';
import { Child } from 'src/child/entities/child.entity';
import { LeaveCampInput } from './dto/leave-camp-input';
import * as moment from 'moment-timezone';

@Resolver(() => RegistrationAttendance)
// @UseGuards(GqlAuthGuard)
export class RegistrationAttendanceResolver {
  constructor(private readonly service: RegistrationAttendanceService) {}

  @Mutation(() => GraphQLJSONObject, { name: 'enterCamp' })
  async enter(
    @Args('input') input: CreateRegistrationAttendanceInput,
    @CurrentUser('id') userId: string,
    @CurrentUser('type') type: UserType,
  ) {
    try {
      if (type !== UserType.admin) {
        return {
          message: 'Unauthorized, only admins can enter attendance',
          success: false,
        };
      }

      const { parentId, campRegistrationId } = await this.service.validateToken(
        input.token,
      );

      if (campRegistrationId !== input.campRegistrationId) {
        throw Error('Invalid attendance token 1.1');
      }

      const remainingAttendances = await this.service.getRemainingAttendances(
        parentId,
        campRegistrationId,
      );

      const campVariant = await this.service.checkCampVariant(
        input.campVariantId,
      );
      if (!campVariant) {
        return {
          message: 'Camp variant not found',
          success: false,
        };
      }

      if (remainingAttendances === 0) {
        return {
          message: 'No remaining attendance days for this registration',
          success: false,
        };
      }

      const existingChild = await this.service.checkChild(
        input.childId,
        parentId,
      );
      if (!existingChild) {
        return {
          message: 'Child not found',
          success: false,
        };
      }

      const now = moment.tz('Africa/Cairo');

      if (now.isBefore(campVariant.startDate)) {
        return {
          message: 'Attendance cannot be recorded before the camp start date',
          success: false,
        };
      }

      if (now.isAfter(campVariant.endDate)) {
        return {
          message: 'Attendance cannot be recorded after the camp end date',
          success: false,
        };
      }

      return this.service.enter(input, userId);
    } catch (e) {
      console.log(e);
      return {
        success: false,
        message: e.message ?? 'Error processing attendance',
      };
    }
  }

  @Query(() => GraphQLJSONObject)
  validateAndFindAttendance(
    @Args('token') token: string,
    @Args('campVariantId') campVariantId: number,
  ) {
    return this.service.validateAndFindAttendance(token, campVariantId);
  }

  @Mutation(() => GraphQLJSONObject, { name: 'leaveCamp' })
  async leave(
    @Args('input') input: LeaveCampInput,
    @CurrentUser('id') userId: string,
    @CurrentUser('type') type: UserType,
  ) {
    try {
      if (type !== UserType.admin) {
        return {
          message: 'Unauthorized, only admins can record leave',
          success: false,
        };
      }

      const existingAttendance = await this.service.findActiveAttendanceById(
        input.registrationAttendanceId,
      );

      if (!existingAttendance) {
        return {
          message: 'No active attendance record found',
          success: false,
        };
      }

      return this.service.leave(input.registrationAttendanceId, userId);
    } catch (e) {
      console.log(e);
      return {
        success: false,
        message: e.message,
      };
    }
  }

  @Query(() => RegistrationAttendancePage)
  paginateRegistrationAttendance(
    @Args('input') input: PaginateRegistrationAttendanceInput,
  ) {
    return this.service.paginate(input);
  }

  @ResolveField(() => CampRegistration, { nullable: true })
  campRegistration(
    @Parent() parent: RegistrationAttendance,
    @Context() { loader }: { loader: DataloaderRegistry },
  ) {
    return loader.CampRegistrationDataLoader.load(parent.campRegistrationId);
  }

  @ResolveField(() => CampVariantRegistration, { nullable: true })
  campVariantRegistration(
    @Parent() parent: RegistrationAttendance,
    @Context() { loaders }: { loaders: DataloaderRegistry },
  ) {
    return loaders
      .CampVariantsDataLoader({ withDeleted: true })
      .load(parent.campVariantId);
  }

  @ResolveField(() => Child, { nullable: true })
  child(
    @Parent() parent: RegistrationAttendance,
    @Context() { loaders }: { loaders: DataloaderRegistry },
  ) {
    return loaders.ChildDataLoader.load(parent.childId);
  }

  @ResolveField(() => User, { nullable: true })
  enterAuditor(
    @Parent() parent: RegistrationAttendance,
    @Context() { loaders }: { loaders: DataloaderRegistry },
  ) {
    return loaders.UsersDataLoader.load(parent.enterAuditorId);
  }

  @ResolveField(() => User, { nullable: true })
  leaveAuditor(
    @Parent() parent: RegistrationAttendance,
    @Context() { loaders }: { loaders: DataloaderRegistry },
  ) {
    return parent.leaveAuditorId
      ? loaders.UsersDataLoader.load(parent.leaveAuditorId)
      : null;
  }
}
