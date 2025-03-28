import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { AllergyService } from './allergy.service';
import { Allergy } from './entities/allergy.entity';
import { CreateAllergyInput } from './dto/create-allergy.input';
import { UpdateAllergyInput } from './dto/update-allergy.input';
import { GraphQLJSONObject } from 'graphql-type-json';

@Resolver(() => Allergy)
export class AllergyResolver {
  constructor(private readonly allergyService: AllergyService) {}

  @Mutation(() => GraphQLJSONObject)
  createAllergy(@Args('input') input: CreateAllergyInput) {
    return this.allergyService.create(input);
  }

  @Query(() => Allergy, { nullable: true })
  findOneAllergy(@Args('id', { type: () => Int }) id: number) {
    return this.allergyService.findOne(id);
  }

  @Mutation(() => GraphQLJSONObject)
  updateAllergy(@Args('updateAllergyInput') input: UpdateAllergyInput) {
    return this.allergyService.update(input);
  }

  @Mutation(() => GraphQLJSONObject)
  removeAllergy(@Args('ids', { type: () => [Int] }) ids: number[]) {
    return this.allergyService.remove(ids);
  }
}
