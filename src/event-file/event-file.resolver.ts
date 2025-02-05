import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { EventFileService } from './event-file.service';
import { EventFile } from './entities/event-file.entity';
import { CreateEventFileInput } from './dto/create-event-file.input';
import { UpdateEventFileInput } from './dto/update-event-file.input';

@Resolver(() => EventFile)
export class EventFileResolver {
  constructor(private readonly eventFileService: EventFileService) {}

  @Mutation(() => EventFile)
  createEventFile(@Args('createEventFileInput') createEventFileInput: CreateEventFileInput) {
    return this.eventFileService.create(createEventFileInput);
  }

  @Query(() => [EventFile], { name: 'eventFile' })
  findAll() {
    return this.eventFileService.findAll();
  }

  @Query(() => EventFile, { name: 'eventFile' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.eventFileService.findOne(id);
  }

  @Mutation(() => EventFile)
  updateEventFile(@Args('updateEventFileInput') updateEventFileInput: UpdateEventFileInput) {
    return this.eventFileService.update(updateEventFileInput.id, updateEventFileInput);
  }

  @Mutation(() => EventFile)
  removeEventFile(@Args('id', { type: () => Int }) id: number) {
    return this.eventFileService.remove(id);
  }
}
