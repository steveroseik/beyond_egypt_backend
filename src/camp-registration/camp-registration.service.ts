import { Injectable } from '@nestjs/common';
import { CreateCampRegistrationInput } from './dto/create-camp-registration.input';
import { UpdateCampRegistrationInput } from './dto/update-camp-registration.input';

@Injectable()
export class CampRegistrationService {
  create(createCampRegistrationInput: CreateCampRegistrationInput) {
    return 'This action adds a new campRegistration';
  }

  findAll() {
    return `This action returns all campRegistration`;
  }

  findOne(id: number) {
    return `This action returns a #${id} campRegistration`;
  }

  update(id: number, updateCampRegistrationInput: UpdateCampRegistrationInput) {
    return `This action updates a #${id} campRegistration`;
  }

  remove(id: number) {
    return `This action removes a #${id} campRegistration`;
  }
}
