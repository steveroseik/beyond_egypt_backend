import * as DataLoader from 'dataloader';
import { Event } from 'src/event/entities/event.entity';
import { EventService } from 'src/event/event.service';

export class EventsDataLoader {
  public static create(service: EventService) {
    return new DataLoader<number, Event>(async (keys: readonly number[]) => {
      const data = await service.findAllByKeys(keys);
      return keys.map((key) => data.find((item) => item.id === key));
    });
  }
}
