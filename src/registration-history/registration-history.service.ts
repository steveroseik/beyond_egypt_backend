import { Injectable } from '@nestjs/common';
import { CreateRegistrationHistoryInput } from './dto/create-registration-history.input';
import { UpdateRegistrationHistoryInput } from './dto/update-registration-history.input';

@Injectable()
export class RegistrationHistoryService {
  create(createRegistrationHistoryInput: CreateRegistrationHistoryInput) {
    return 'This action adds a new registrationHistory';
  }

  findAll() {
    return `This action returns all registrationHistory`;
  }

  findOne(id: number) {
    return `This action returns a #${id} registrationHistory`;
  }

  update(id: number, updateRegistrationHistoryInput: UpdateRegistrationHistoryInput) {
    return `This action updates a #${id} registrationHistory`;
  }

  remove(id: number) {
    return `This action removes a #${id} registrationHistory`;
  }
}
