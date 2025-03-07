import { Injectable } from '@nestjs/common';
import { CreateCampVariantInput } from './dto/create-camp-variant.input';
import { UpdateCampVariantInput } from './dto/update-camp-variant.input';
import { InjectRepository } from '@nestjs/typeorm';
import { CampVariant } from './entities/camp-variant.entity';
import { DataSource, In, Repository } from 'typeorm';

@Injectable()
export class CampVariantService {
  constructor(
    @InjectRepository(CampVariant) private repo: Repository<CampVariant>,
    private dataSource: DataSource,
  ) {}

  create(createCampVariantInput: CreateCampVariantInput) {
    return 'This action adds a new campVariant';
  }

  findAll() {
    return `This action returns all campVariant`;
  }

  findOne(id: number) {
    return `This action returns a #${id} campVariant`;
  }

  update(id: number, updateCampVariantInput: UpdateCampVariantInput) {
    return `This action updates a #${id} campVariant`;
  }

  remove(id: number) {
    return `This action removes a #${id} campVariant`;
  }

  findCampVariantsByCampId(keys: readonly number[]) {
    return this.repo.find({ where: { campId: In(keys) } });
  }
}
