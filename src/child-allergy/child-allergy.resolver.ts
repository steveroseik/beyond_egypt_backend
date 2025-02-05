import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { ChildAllergyService } from './child-allergy.service';
import { ChildAllergy } from './entities/child-allergy.entity';
import { CreateChildAllergyInput } from './dto/create-child-allergy.input';
import { UpdateChildAllergyInput } from './dto/update-child-allergy.input';

@Resolver(() => ChildAllergy)
export class ChildAllergyResolver {
  constructor(private readonly childAllergyService: ChildAllergyService) {}

  @Mutation(() => ChildAllergy)
  createChildAllergy(@Args('createChildAllergyInput') createChildAllergyInput: CreateChildAllergyInput) {
    return this.childAllergyService.create(createChildAllergyInput);
  }

  @Query(() => [ChildAllergy], { name: 'childAllergy' })
  findAll() {
    return this.childAllergyService.findAll();
  }

  @Query(() => ChildAllergy, { name: 'childAllergy' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.childAllergyService.findOne(id);
  }

  @Mutation(() => ChildAllergy)
  updateChildAllergy(@Args('updateChildAllergyInput') updateChildAllergyInput: UpdateChildAllergyInput) {
    return this.childAllergyService.update(updateChildAllergyInput.id, updateChildAllergyInput);
  }

  @Mutation(() => ChildAllergy)
  removeChildAllergy(@Args('id', { type: () => Int }) id: number) {
    return this.childAllergyService.remove(id);
  }
}
