import { Injectable } from '@nestjs/common';
import { CreateCampInput } from './dto/create-camp.input';
import { UpdateCampInput } from './dto/update-camp.input';
import { PaginateCampsInput } from './dto/paginate-camps.input';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Camp } from './entities/camp.entity';
import { buildPaginator } from 'typeorm-cursor-pagination';

@Injectable()
export class CampService {
  constructor(
    @InjectRepository(Camp)
    private readonly repo: Repository<Camp>,
  ) {}

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

  async paginate(input: PaginateCampsInput) {
    const queryBuilder = this.repo.createQueryBuilder('camp');

    const paginator = buildPaginator({
      entity: Camp,
      alias: 'camp',
      paginationKeys: ['createdAt', 'id'],
      query: {
        ...input,
        order: input.isAsc ? 'ASC' : 'DESC',
      },
    });

    return paginator.paginate(queryBuilder);
  }
}
