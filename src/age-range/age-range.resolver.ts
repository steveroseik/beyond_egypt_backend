import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ResolveField,
  Parent,
  Context,
} from '@nestjs/graphql';
import { AgeRangeService } from './age-range.service';
import { AgeRange } from './entities/age-range.entity';
import { CreateAgeRangeInput } from './dto/create-age-range.input';
import { UpdateAgeRangeInput } from './dto/update-age-range.input';
import { File } from 'src/file/entities/file.entity';
import { DataloaderRegistry } from 'src/dataloaders/dataloaderRegistry';
import { GraphQLJSONObject } from 'graphql-type-json';

@Resolver(() => AgeRange)
export class AgeRangeResolver {
  constructor(private readonly ageRangeService: AgeRangeService) {}

  @Mutation(() => GraphQLJSONObject)
  createAgeRange(@Args('input') createAgeRangeInput: CreateAgeRangeInput) {
    return this.ageRangeService.create(createAgeRangeInput);
  }

  @Query(() => [AgeRange], { name: 'ageRange' })
  findAll() {
    return this.ageRangeService.findAll();
  }

  @Query(() => AgeRange, { nullable: true })
  findOneAgeRange(@Args('id', { type: () => Int }) id: number) {
    return this.ageRangeService.findOne(id);
  }

  @Mutation(() => GraphQLJSONObject)
  updateAgeRange(@Args('input') updateAgeRangeInput: UpdateAgeRangeInput) {
    return this.ageRangeService.update(updateAgeRangeInput);
  }

  @Mutation(() => GraphQLJSONObject)
  removeAgeRange(@Args('ids', { type: () => [Int] }) ids: number[]) {
    return this.ageRangeService.remove(ids);
  }

  @ResolveField(() => File, { nullable: true })
  thumbnail(
    @Parent() ageRange: AgeRange,
    @Context() { loaders }: { loaders: DataloaderRegistry },
  ) {
    return ageRange.thumbnailId
      ? loaders.FilesLoader.load(ageRange.thumbnailId)
      : null;
  }
}
