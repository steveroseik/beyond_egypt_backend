import { Injectable } from '@nestjs/common';
import { CreateAgeRangeInput } from './dto/create-age-range.input';
import { UpdateAgeRangeInput } from './dto/update-age-range.input';
import { InjectRepository } from '@nestjs/typeorm';
import { AgeRange } from './entities/age-range.entity';
import { In, Repository } from 'typeorm';

@Injectable()
export class AgeRangeService {
  constructor(
    @InjectRepository(AgeRange) private readonly repo: Repository<AgeRange>,
  ) {}

  async create(createAgeRangeInput: CreateAgeRangeInput) {
    try {
      const created = await this.repo.insert(createAgeRangeInput);
      if (created.raw.affectedRows === 0) {
        throw new Error('Error creating age range');
      }

      return {
        success: true,
        message: 'Age range created successfully',
        data: {
          id: created.raw.insertId,
        },
      };
    } catch (e) {
      console.log(e);
      return {
        success: false,
        message: e.message,
      };
    }
  }

  findAll() {
    return `This action returns all ageRange`;
  }

  findOne(id: number) {
    return `This action returns a #${id} ageRange`;
  }

  async update(updateAgeRangeInput: UpdateAgeRangeInput) {
    try {
      const updated = await this.repo.update(
        updateAgeRangeInput.id,
        updateAgeRangeInput,
      );
      if (updated.affected === 0) {
        throw new Error('Error updating age range');
      }

      return {
        success: true,
        message: 'Age range updated successfully',
      };
    } catch (e) {
      console.log(e);
      return {
        success: false,
        message: e.message,
      };
    }
  }

  async remove(ids: number[]) {
    try {
      const deleted = await this.repo.delete({ id: In(ids) });
      if (deleted.affected === 0) {
        throw new Error('Error deleting age range');
      }

      return {
        success: true,
        message: `${deleted.affected} age range(s) deleted successfully`,
      };
    } catch (e) {
      console.log(e);
      return {
        success: false,
        message: e.message,
      };
    }
  }
}
