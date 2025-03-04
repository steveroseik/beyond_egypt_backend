import { Injectable } from '@nestjs/common';
import { CreateRegistrationReserveInput } from './dto/create-registration-reserve.input';
import { UpdateRegistrationReserveInput } from './dto/update-registration-reserve.input';

@Injectable()
export class RegistrationReserveService {
  create(createRegistrationReserveInput: CreateRegistrationReserveInput) {
    return 'This action adds a new registrationReserve';
  }

  findAll() {
    return `This action returns all registrationReserve`;
  }

  findOne(id: number) {
    return `This action returns a #${id} registrationReserve`;
  }

  update(id: number, updateRegistrationReserveInput: UpdateRegistrationReserveInput) {
    return `This action updates a #${id} registrationReserve`;
  }

  remove(id: number) {
    return `This action removes a #${id} registrationReserve`;
  }
}
