import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { AgeRangeService } from './age-range.service';
import { AgeRange } from './entities/age-range.entity';
import { CreateAgeRangeInput } from './dto/create-age-range.input';
import { UpdateAgeRangeInput } from './dto/update-age-range.input';

@Resolver(() => AgeRange)
export class AgeRangeResolver {
  constructor(private readonly ageRangeService: AgeRangeService) {}

  @Mutation(() => AgeRange)
  createAgeRange(@Args('createAgeRangeInput') createAgeRangeInput: CreateAgeRangeInput) {
    return this.ageRangeService.create(createAgeRangeInput);
  }

  @Query(() => [AgeRange], { name: 'ageRange' })
  findAll() {
    return this.ageRangeService.findAll();
  }

  @Query(() => AgeRange, { name: 'ageRange' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.ageRangeService.findOne(id);
  }

  @Mutation(() => AgeRange)
  updateAgeRange(@Args('updateAgeRangeInput') updateAgeRangeInput: UpdateAgeRangeInput) {
    return this.ageRangeService.update(updateAgeRangeInput.id, updateAgeRangeInput);
  }

  @Mutation(() => AgeRange)
  removeAgeRange(@Args('id', { type: () => Int }) id: number) {
    return this.ageRangeService.remove(id);
  }
}
