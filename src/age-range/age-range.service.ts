import { Injectable } from '@nestjs/common';
import { CreateAgeRangeInput } from './dto/create-age-range.input';
import { UpdateAgeRangeInput } from './dto/update-age-range.input';

@Injectable()
export class AgeRangeService {
  create(createAgeRangeInput: CreateAgeRangeInput) {
    return 'This action adds a new ageRange';
  }

  findAll() {
    return `This action returns all ageRange`;
  }

  findOne(id: number) {
    return `This action returns a #${id} ageRange`;
  }

  update(id: number, updateAgeRangeInput: UpdateAgeRangeInput) {
    return `This action updates a #${id} ageRange`;
  }

  remove(id: number) {
    return `This action removes a #${id} ageRange`;
  }
}
