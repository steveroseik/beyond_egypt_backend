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

  async update(input: UpdateParentAdditionalInput) {
    try {
      const updateParentAdditional = await this.repo.update(
        {
          id: input.id,
          ...(input.userId && { userId: input.userId }),
        },
        input,
      );

      if (updateParentAdditional.affected === 0) {
        throw new Error('Parent Additional not found');
      }

      return {
        success: true,
        message: 'Parent Additional updated successfully',
      };
    } catch (e) {
      return {
        success: false,
        message: e.message,
      };
    }
  }

  remove(id: number) {
    return `This action removes a #${id} parentAdditional`;
  }
}
