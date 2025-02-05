import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { ParentAdditionalService } from './parent-additional.service';
import { ParentAdditional } from './entities/parent-additional.entity';
import { CreateParentAdditionalInput } from './dto/create-parent-additional.input';
import { UpdateParentAdditionalInput } from './dto/update-parent-additional.input';

@Resolver(() => ParentAdditional)
export class ParentAdditionalResolver {
  constructor(private readonly parentAdditionalService: ParentAdditionalService) {}

  @Mutation(() => ParentAdditional)
  createParentAdditional(@Args('createParentAdditionalInput') createParentAdditionalInput: CreateParentAdditionalInput) {
    return this.parentAdditionalService.create(createParentAdditionalInput);
  }

  @Query(() => [ParentAdditional], { name: 'parentAdditional' })
  findAll() {
    return this.parentAdditionalService.findAll();
  }

  @Query(() => ParentAdditional, { name: 'parentAdditional' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.parentAdditionalService.findOne(id);
  }

  @Mutation(() => ParentAdditional)
  updateParentAdditional(@Args('updateParentAdditionalInput') updateParentAdditionalInput: UpdateParentAdditionalInput) {
    return this.parentAdditionalService.update(updateParentAdditionalInput.id, updateParentAdditionalInput);
  }

  @Mutation(() => ParentAdditional)
  removeParentAdditional(@Args('id', { type: () => Int }) id: number) {
    return this.parentAdditionalService.remove(id);
  }
}
