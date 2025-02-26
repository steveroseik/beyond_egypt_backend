import { Injectable } from '@nestjs/common';
import { CreateSchoolInput } from './dto/create-school.input';
import { UpdateSchoolInput } from './dto/update-school.input';
import { InjectRepository } from '@nestjs/typeorm';
import { School } from './entities/school.entity';
import { DataSource, Repository } from 'typeorm';
import { PaginateSchoolsInput } from './dto/paginate-schools.input';
import { buildPaginator } from 'typeorm-cursor-pagination';

@Injectable()
export class SchoolService {
  constructor(
    @InjectRepository(School) private repo: Repository<School>,
    private dataSource: DataSource,
  ) {}

  create(createSchoolInput: CreateSchoolInput) {
    return 'This action adds a new school';
  }

  findAll() {
    return `This action returns all school`;
  }

  findOne(id: number) {
    return `This action returns a #${id} school`;
  }

  update(id: number, updateSchoolInput: UpdateSchoolInput) {
    return `This action updates a #${id} school`;
  }

  remove(id: number) {
    return `This action removes a #${id} school`;
  }

  paginateSchools(input: PaginateSchoolsInput) {
    const queryBuilder = this.repo.createQueryBuilder('school');

    if (input.name) {
      queryBuilder.where(
        'school.nameEn like :name OR school.nameAr like :name',
        { name: `%${input.name}%` },
      );
    }

    const paginator = buildPaginator({
      entity: School,
      alias: 'alias',
      query: {
        ...input,
      },
    });

    return paginator.paginate(queryBuilder);
  }
}
