import { Injectable } from '@nestjs/common';
import { CreateCampInput } from './dto/create-camp.input';
import { UpdateCampInput } from './dto/update-camp.input';

@Injectable()
export class CampService {
  create(createCampInput: CreateCampInput) {
    return 'This action adds a new camp';
  }

  findAll() {
    return `This action returns all camp`;
  }

  findOne(id: number) {
    return `This action returns a #${id} camp`;
  }

  update(id: number, updateCampInput: UpdateCampInput) {
    return `This action updates a #${id} camp`;
  }

  remove(id: number) {
    return `This action removes a #${id} camp`;
  }
}
