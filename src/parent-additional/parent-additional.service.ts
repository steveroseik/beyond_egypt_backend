import { Injectable } from '@nestjs/common';
import { CreateParentAdditionalInput } from './dto/create-parent-additional.input';
import { UpdateParentAdditionalInput } from './dto/update-parent-additional.input';

@Injectable()
export class ParentAdditionalService {
  create(createParentAdditionalInput: CreateParentAdditionalInput) {
    return 'This action adds a new parentAdditional';
  }

  findAll() {
    return `This action returns all parentAdditional`;
  }

  findOne(id: number) {
    return `This action returns a #${id} parentAdditional`;
  }

  update(id: number, updateParentAdditionalInput: UpdateParentAdditionalInput) {
    return `This action updates a #${id} parentAdditional`;
  }

  remove(id: number) {
    return `This action removes a #${id} parentAdditional`;
  }
}
