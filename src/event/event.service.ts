import { Injectable } from '@nestjs/common';
import { CreateEventInput } from './dto/create-event.input';
import { UpdateEventInput } from './dto/update-event.input';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PaginateEventsInput } from './dto/paginate-events.input';
import { buildPaginator } from 'typeorm-cursor-pagination';
import { Event } from './entities/event.entity';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
  ) {}
  create(createEventInput: CreateEventInput) {
    return 'This action adds a new event';
  }

  findAllByKeys(keys: readonly number[]) {
    return this.eventRepository.find({ where: { id: In(keys) } });
  }

  findOne(id: number) {
    return this.eventRepository.findOne({ where: { id } });
  }

  update(id: number, updateEventInput: UpdateEventInput) {
    return `This action updates a #${id} event`;
  }

  remove(id: number) {
    return `This action removes a #${id} event`;
  }

  async paginate(input: PaginateEventsInput) {
    const queryBuilder = this.eventRepository.createQueryBuilder('event');
    const paginator = buildPaginator({
      entity: Event,
      alias: 'event',
      paginationKeys: ['createdAt', 'id'],
      query: {
        ...input,
        order: input.isAsc ? 'ASC' : 'DESC',
      },
    });

    return paginator.paginate(queryBuilder);
  }
}
