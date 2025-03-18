import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { ParentAdditionalService } from './parent-additional.service';
import { ParentAdditional } from './entities/parent-additional.entity';
import { CreateParentAdditionalInput } from './dto/create-parent-additional.input';
import { UpdateParentAdditionalInput } from './dto/update-parent-additional.input';
import { CurrentUser } from 'src/auth/decorators/currentUserDecorator';
import { UserType } from 'support/enums';
import { GraphQLJSONObject } from 'graphql-type-json';

@Resolver(() => ParentAdditional)
export class ParentAdditionalResolver {
  constructor(
    private readonly parentAdditionalService: ParentAdditionalService,
  ) {}

  @Mutation(() => ParentAdditional)
  createParentAdditional(
    @Args('createParentAdditionalInput')
    createParentAdditionalInput: CreateParentAdditionalInput,
  ) {
    return this.parentAdditionalService.create(createParentAdditionalInput);
  }

  @Query(() => ParentAdditional, { name: 'parentAdditional' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.parentAdditionalService.findOne(id);
  }

  @Mutation(() => GraphQLJSONObject)
  updateParentAdditional(
    @Args('input')
    input: UpdateParentAdditionalInput,
    @CurrentUser('id') userId: string,
    @CurrentUser('type') userType: string,
  ) {
    if (userType == UserType.parent) {
      input.userId = userId;
    }
    return this.parentAdditionalService.update(input);
  }

  @Mutation(() => ParentAdditional)
  removeParentAdditional(@Args('id', { type: () => Int }) id: number) {
    return this.parentAdditionalService.remove(id);
  }
}
