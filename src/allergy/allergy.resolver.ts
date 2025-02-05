import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { AllergyService } from './allergy.service';
import { Allergy } from './entities/allergy.entity';
import { CreateAllergyInput } from './dto/create-allergy.input';
import { UpdateAllergyInput } from './dto/update-allergy.input';

@Resolver(() => Allergy)
export class AllergyResolver {
  constructor(private readonly allergyService: AllergyService) {}

  @Mutation(() => Allergy)
  createAllergy(@Args('createAllergyInput') createAllergyInput: CreateAllergyInput) {
    return this.allergyService.create(createAllergyInput);
  }

  @Query(() => [Allergy], { name: 'allergy' })
  findAll() {
    return this.allergyService.findAll();
  }

  @Query(() => Allergy, { name: 'allergy' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.allergyService.findOne(id);
  }

  @Mutation(() => Allergy)
  updateAllergy(@Args('updateAllergyInput') updateAllergyInput: UpdateAllergyInput) {
    return this.allergyService.update(updateAllergyInput.id, updateAllergyInput);
  }

  @Mutation(() => Allergy)
  removeAllergy(@Args('id', { type: () => Int }) id: number) {
    return this.allergyService.remove(id);
  }
}
