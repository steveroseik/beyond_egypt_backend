import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { LocationService } from './location.service';
import { Location } from './entities/location.entity';
import { CreateLocationInput } from './dto/create-location.input';
import { UpdateLocationInput } from './dto/update-location.input';
import { LocationsPage } from './entities/location-page.entity';
import { PaginateLocationsInput } from './dto/paginate-locations.input';
import { UpdateLocationsInput } from './dto/update-locations.input';
import { GraphQLJSONObject } from 'graphql-type-json';

@Resolver(() => Location)
export class LocationResolver {
  constructor(private readonly locationService: LocationService) {}

  @Mutation(() => GraphQLJSONObject)
  createLocation(@Args('input') input: CreateLocationInput) {
    return this.locationService.create(input);
  }

  @Query(() => Location, { nullable: true })
  findOneLocation(@Args('id', { type: () => Int }) id: number) {
    return this.locationService.findOne(id);
  }

  @Mutation(() => GraphQLJSONObject)
  updateLocation(@Args('input') input: UpdateLocationsInput) {
    return this.locationService.update(input);
  }

  @Mutation(() => Location)
  removeLocation(@Args('ids', { type: () => [Int] }) ids: number[]) {
    return this.locationService.remove(ids);
  }

  @Query(() => LocationsPage)
  paginateLocations(@Args('input') input: PaginateLocationsInput) {
    return this.locationService.paginate(input);
  }
}
