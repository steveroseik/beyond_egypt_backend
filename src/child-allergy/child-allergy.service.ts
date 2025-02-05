import { Injectable } from '@nestjs/common';
import { CreateChildAllergyInput } from './dto/create-child-allergy.input';
import { UpdateChildAllergyInput } from './dto/update-child-allergy.input';

@Injectable()
export class ChildAllergyService {
  create(createChildAllergyInput: CreateChildAllergyInput) {
    return 'This action adds a new childAllergy';
  }

  findAll() {
    return `This action returns all childAllergy`;
  }

  findOne(id: number) {
    return `This action returns a #${id} childAllergy`;
  }

  update(id: number, updateChildAllergyInput: UpdateChildAllergyInput) {
    return `This action updates a #${id} childAllergy`;
  }

  remove(id: number) {
    return `This action removes a #${id} childAllergy`;
  }
}
