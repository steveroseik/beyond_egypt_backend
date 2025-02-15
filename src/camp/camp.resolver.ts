import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { CampService } from './camp.service';
import { Camp } from './entities/camp.entity';
import { CreateCampInput } from './dto/create-camp.input';
import { UpdateCampInput } from './dto/update-camp.input';
import { CampPage } from './entities/camp-page.entity';
import { PaginateCampsInput } from './dto/paginate-camps.input';

@Resolver(() => Camp)
export class CampResolver {
  constructor(private readonly campService: CampService) {}

  @Mutation(() => Camp)
  createCamp(@Args('createCampInput') createCampInput: CreateCampInput) {
    return this.campService.create(createCampInput);
  }

  @Query(() => [Camp], { name: 'camp' })
  findAll() {
    return this.campService.findAll();
  }

  @Query(() => Camp, { name: 'camp' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.campService.findOne(id);
  }

  @Mutation(() => Camp)
  updateCamp(@Args('updateCampInput') updateCampInput: UpdateCampInput) {
    return this.campService.update(updateCampInput.id, updateCampInput);
  }

  @Mutation(() => Camp)
  removeCamp(@Args('id', { type: () => Int }) id: number) {
    return this.campService.remove(id);
  }

  @Query(() => CampPage)
  paginateCamps(@Args('input') input: PaginateCampsInput) {
    return this.campService.paginate(input);
  }
}
