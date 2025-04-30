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
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { ResponseWrapper } from 'support/response-wrapper.entity';
import { GraphQLObjectType } from 'graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import { Public } from 'src/auth/decorators/publicDecorator';
import { CreateUserResponse } from './entities/create-user-response.wrapper';
import { ParentAdditional } from 'src/parent-additional/entities/parent-additional.entity';
import { DataloaderRegistry } from 'src/dataloaders/dataloaderRegistry';
import { Child } from 'src/child/entities/child.entity';
import { CurrentUser } from 'src/auth/decorators/currentUserDecorator';
import { UserType } from 'support/enums';
import { UsersPage } from './entities/users-page.entity';
import { PaginateUsersInput } from './dto/paginate-users.input';
import { CreateEmployeeInput } from './dto/create-employee.input';
import { RegisterUserInput } from './dto/register-user.input';
import { FindInactiveUserInput } from './dto/find-inactive-user.input';

@Resolver(() => User)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Public()
  @Mutation(() => CreateUserResponse)
  createUser(@Args('input') createUserInput: CreateUserInput) {
    createUserInput.type = UserType.parent;
    return this.userService.create(createUserInput, UserType.parent);
  }

  @Mutation(() => GraphQLJSONObject)
  createParent(
    @Args('input') createUserInput: CreateUserInput,
    @CurrentUser('type') userType: UserType,
  ) {
    if (userType === UserType.parent) {
      return {
        success: false,
        message: 'You are not authorized to perform this action',
      };
    }
    createUserInput.type = UserType.parent;
    return this.userService.create(createUserInput, userType);
  }

  @Query(() => [User], { name: 'user' })
  findAll() {
    return this.userService.findAll();
  }

  @Public()
  @Query(() => User, { nullable: true })
  findInactiveUser(@Args('input') input: FindInactiveUserInput) {
    if (input.id.length !== 12) return null;
    return this.userService.findInactiveUser(input);
  }

  @Query(() => User)
  findOneUser(@Args('id', { type: () => String }) id: string) {
    return this.userService.findOne(id);
  }

  @Mutation(() => GraphQLJSONObject)
  updateUser(
    @Args('input') input: UpdateUserInput,
    @CurrentUser('id') userId: string,
    @CurrentUser('type') userType: UserType,
  ) {
    if (userType == UserType.parent) {
      input.id = userId;
    }
    return this.userService.update(input);
  }

  @Mutation(() => GraphQLJSONObject)
  createEmployee(@Args('input') input: CreateEmployeeInput) {
    return this.userService.createEmployee(input);
  }

  @Public()
  @Mutation(() => CreateUserResponse)
  registerUser(@Args('input') createUserInput: RegisterUserInput) {
    return this.userService.register(createUserInput);
  }

  @Mutation(() => GraphQLJSONObject)
  removeUser(@Args('id') id: string) {
    return this.userService.remove(id);
  }

  @ResolveField(() => [ParentAdditional])
  parentAdditionals(
    @Parent() parent: User,
    @Context() { loaders }: { loaders: DataloaderRegistry },
  ) {
    return (
      parent.parentAdditionals ??
      loaders.ParentAdditionalDataLoader.load(parent.id)
    );
  }

  @Query(() => UsersPage)
  paginateUsers(@Args('input') input: PaginateUsersInput) {
    return this.userService.paginate(input);
  }

  @ResolveField(() => [Child])
  children(
    @Parent() parent: User,
    @Context() { loaders }: { loaders: DataloaderRegistry },
  ) {
    return loaders.ChildByParentDataLoader.load(parent.id);
  }
}
