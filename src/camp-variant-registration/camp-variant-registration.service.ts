import { Injectable } from '@nestjs/common';
import { CreateCampVariantRegistrationInput } from './dto/create-camp-variant-registration.input';
import { UpdateCampVariantRegistrationInput } from './dto/update-camp-variant-registration.input';

@Injectable()
export class CampVariantRegistrationService {
  create(createCampVariantRegistrationInput: CreateCampVariantRegistrationInput) {
    return 'This action adds a new campVariantRegistration';
  }

  findAll() {
    return `This action returns all campVariantRegistration`;
  }

  findOne(id: number) {
    return `This action returns a #${id} campVariantRegistration`;
  }

  update(id: number, updateCampVariantRegistrationInput: UpdateCampVariantRegistrationInput) {
    return `This action updates a #${id} campVariantRegistration`;
  }

  remove(id: number) {
    return `This action removes a #${id} campVariantRegistration`;
  }
}
