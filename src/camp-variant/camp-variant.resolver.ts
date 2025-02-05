import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { CampVariantService } from './camp-variant.service';
import { CampVariant } from './entities/camp-variant.entity';
import { CreateCampVariantInput } from './dto/create-camp-variant.input';
import { UpdateCampVariantInput } from './dto/update-camp-variant.input';

@Resolver(() => CampVariant)
export class CampVariantResolver {
  constructor(private readonly campVariantService: CampVariantService) {}

  @Mutation(() => CampVariant)
  createCampVariant(@Args('createCampVariantInput') createCampVariantInput: CreateCampVariantInput) {
    return this.campVariantService.create(createCampVariantInput);
  }

  @Query(() => [CampVariant], { name: 'campVariant' })
  findAll() {
    return this.campVariantService.findAll();
  }

  @Query(() => CampVariant, { name: 'campVariant' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.campVariantService.findOne(id);
  }

  @Mutation(() => CampVariant)
  updateCampVariant(@Args('updateCampVariantInput') updateCampVariantInput: UpdateCampVariantInput) {
    return this.campVariantService.update(updateCampVariantInput.id, updateCampVariantInput);
  }

  @Mutation(() => CampVariant)
  removeCampVariant(@Args('id', { type: () => Int }) id: number) {
    return this.campVariantService.remove(id);
  }
}
