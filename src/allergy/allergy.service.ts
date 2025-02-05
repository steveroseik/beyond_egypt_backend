import { Injectable } from '@nestjs/common';
import { CreateAllergyInput } from './dto/create-allergy.input';
import { UpdateAllergyInput } from './dto/update-allergy.input';

@Injectable()
export class AllergyService {
  create(createAllergyInput: CreateAllergyInput) {
    return 'This action adds a new allergy';
  }

  findAll() {
    return `This action returns all allergy`;
  }

  findOne(id: number) {
    return `This action returns a #${id} allergy`;
  }

  update(id: number, updateAllergyInput: UpdateAllergyInput) {
    return `This action updates a #${id} allergy`;
  }

  remove(id: number) {
    return `This action removes a #${id} allergy`;
  }
}
