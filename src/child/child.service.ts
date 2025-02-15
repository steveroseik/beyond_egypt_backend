import { Injectable } from '@nestjs/common';
import { CreateChildInput } from './dto/create-child.input';
import { UpdateChildInput } from './dto/update-child.input';
import { PaginateChildInput } from './dto/paginate-child.input';
import { InjectRepository } from '@nestjs/typeorm';
import { Child } from './entities/child.entity';
import { Repository } from 'typeorm';
import { buildPaginator } from 'typeorm-cursor-pagination';

@Injectable()
export class ChildService {
  constructor(
    @InjectRepository(Child) private readonly repo: Repository<Child>,
  ) {}
  create(createChildInput: CreateChildInput) {
    return 'This action adds a new child';
  }

  findAll() {
    return `This action returns all child`;
  }

  findOne(id: number) {
    return `This action returns a #${id} child`;
  }

  update(id: number, updateChildInput: UpdateChildInput) {
    return `This action updates a #${id} child`;
  }

  remove(id: number) {
    return `This action removes a #${id} child`;
  }

  async paginate(input: PaginateChildInput) {
    const queryBuilder = this.repo.createQueryBuilder('child');

    const paginator = buildPaginator({
      entity: Child,
      alias: 'child',
      paginationKeys: ['createdAt', 'id'],
      query: {
        ...input,
        order: input.isAsc ? 'ASC' : 'DESC',
      },
    });

    return paginator.paginate(queryBuilder);
  }
}
