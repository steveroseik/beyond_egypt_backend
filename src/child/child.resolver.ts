import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { ChildService } from './child.service';
import { Child } from './entities/child.entity';
import { CreateChildInput } from './dto/create-child.input';
import { UpdateChildInput } from './dto/update-child.input';
import { ChildPage } from './entities/child-page.entity';
import { PaginateChildInput } from './dto/paginate-child.input';
import { CurrentUser } from 'src/auth/decorators/currentUserDecorator';
import { UserType } from 'support/enums';
import { User } from 'src/user/entities/user.entity';

@Resolver(() => Child)
export class ChildResolver {
  constructor(private readonly childService: ChildService) {}

  @Mutation(() => Child)
  createChild(@Args('createChildInput') createChildInput: CreateChildInput) {
    return this.childService.create(createChildInput);
  }

  @Query(() => [Child], { name: 'child' })
  findAll() {
    return this.childService.findAll();
  }

  @Query(() => Child, { name: 'child' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.childService.findOne(id);
  }

  @Mutation(() => Child)
  updateChild(@Args('updateChildInput') updateChildInput: UpdateChildInput) {
    return this.childService.update(updateChildInput.id, updateChildInput);
  }

  @Mutation(() => Child)
  removeChild(@Args('id', { type: () => Int }) id: number) {
    return this.childService.remove(id);
  }

  @Query(() => ChildPage)
  paginateChildren(
    @Args('input') input: PaginateChildInput,
    @CurrentUser('type') type: UserType,
    @CurrentUser('id') id: string,
  ) {
    if (type == UserType.parent) {
      input.parentId = id;
    }
    return this.childService.paginate(input);
  }
}
