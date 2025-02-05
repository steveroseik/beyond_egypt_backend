import { Injectable } from '@nestjs/common';
import { CreateEventFileInput } from './dto/create-event-file.input';
import { UpdateEventFileInput } from './dto/update-event-file.input';

@Injectable()
export class EventFileService {
  create(createEventFileInput: CreateEventFileInput) {
    return 'This action adds a new eventFile';
  }

  findAll() {
    return `This action returns all eventFile`;
  }

  findOne(id: number) {
    return `This action returns a #${id} eventFile`;
  }

  update(id: number, updateEventFileInput: UpdateEventFileInput) {
    return `This action updates a #${id} eventFile`;
  }

  remove(id: number) {
    return `This action removes a #${id} eventFile`;
  }
}
