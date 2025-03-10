import { Injectable } from '@nestjs/common';
import { CreateParentAdditionalInput } from './dto/create-parent-additional.input';
import { UpdateParentAdditionalInput } from './dto/update-parent-additional.input';
import { InjectRepository } from '@nestjs/typeorm';
import { ParentAdditional } from './entities/parent-additional.entity';
import { In, Repository } from 'typeorm';

@Injectable()
export class ParentAdditionalService {
  constructor(
    @InjectRepository(ParentAdditional)
    private repo: Repository<ParentAdditional>,
  ) {}

  create(createParentAdditionalInput: CreateParentAdditionalInput) {
    return 'This action adds a new parentAdditional';
  }

  findAllByKeys(keys: readonly string[]) {
    return this.repo.find({ where: { userId: In(keys) } });
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
