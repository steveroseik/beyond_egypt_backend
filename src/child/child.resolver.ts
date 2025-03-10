import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { ChildService } from './child.service';
import { Child } from './entities/child.entity';
import { CreateChildInput } from './dto/create-child.input';
import { UpdateChildInput } from './dto/update-child.input';
import { ChildPage } from './entities/child-page.entity';
import { PaginateChildrenInput } from './dto/paginate-children.input';
import { CurrentUser } from 'src/auth/decorators/currentUserDecorator';
import { UserType } from 'support/enums';
import { User } from 'src/user/entities/user.entity';
import { GraphQLJSONObject } from 'graphql-type-json';

@Resolver(() => Child)
export class ChildResolver {
  constructor(private readonly childService: ChildService) {}

  @Mutation(() => Child)
  createChild(@Args('createChildInput') createChildInput: CreateChildInput) {
    return this.childService.create(createChildInput);
  }

  @Query(() => Child, { name: 'child' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.childService.findOne(id);
  }

  @Mutation(() => GraphQLJSONObject)
  updateChild(
    @Args('input') input: UpdateChildInput,
    @CurrentUser('id') userId: string,
    @CurrentUser('type') userType: UserType,
  ) {
    return this.childService.update(input, userId, userType);
  }

  @Mutation(() => Child)
  removeChild(@Args('id', { type: () => Int }) id: number) {
    return this.childService.remove(id);
  }

  @Query(() => ChildPage)
  paginateChildren(
    @Args('input') input: PaginateChildrenInput,
    @CurrentUser('type') type: UserType,
    @CurrentUser('id') id: string,
  ) {
    if (type == UserType.parent) {
      input.parentId = id;
    }
    return this.childService.paginate(input);
  }
}
