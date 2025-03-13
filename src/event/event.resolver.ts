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
import { EventService } from './event.service';
import { Event } from './entities/event.entity';
import { CreateEventInput } from './dto/create-event.input';
import { UpdateEventInput } from './dto/update-event.input';
import { EventPage } from './entities/event-page.entity';
import { PaginateEventsInput } from './dto/paginate-events.input';
import { Public } from 'src/auth/decorators/publicDecorator';
import { Camp } from 'src/camp/entities/camp.entity';
import { DataloaderRegistry } from 'src/dataloaders/dataloaderRegistry';
import { File } from 'src/file/entities/file.entity';

@Resolver(() => Event)
export class EventResolver {
  constructor(private readonly eventService: EventService) {}

  @Mutation(() => Event)
  createEvent(@Args('createEventInput') createEventInput: CreateEventInput) {
    return this.eventService.create(createEventInput);
  }

  @Query(() => [Event], { name: 'event' })
  findAll() {
    return this.eventService.findAll();
  }

  @Public()
  @Query(() => Event)
  findOneEvent(@Args('id', { type: () => Int }) id: number) {
    return this.eventService.findOne(id);
  }

  @Mutation(() => Event)
  updateEvent(@Args('updateEventInput') updateEventInput: UpdateEventInput) {
    return this.eventService.update(updateEventInput.id, updateEventInput);
  }

  @Mutation(() => Event)
  removeEvent(@Args('id', { type: () => Int }) id: number) {
    return this.eventService.remove(id);
  }

  @Public()
  @Query(() => EventPage)
  paginateEvents(@Args('input') input: PaginateEventsInput) {
    return this.eventService.paginate(input);
  }

  @ResolveField(() => [Camp])
  camps(
    @Parent() event: Event,
    @Context() { loaders }: { loaders: DataloaderRegistry },
  ) {
    return event.camps ?? loaders.EventCampsDataLoader.load(event.id);
  }

  @ResolveField(() => [File], { nullable: true })
  thumbnail(
    @Parent() event: Event,
    @Context() { loaders }: { loaders: DataloaderRegistry },
  ) {
    return event.thumbnailId
      ? loaders.FilesLoader.load(event.thumbnailId)
      : null;
  }

  @ResolveField(() => [File], { nullable: true })
  files(
    @Parent() event: Event,
    @Context() { loaders }: { loaders: DataloaderRegistry },
  ) {
    return loaders.EventFilesDataLoader.load(event.id);
  }
}
