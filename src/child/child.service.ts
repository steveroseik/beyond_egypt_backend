import { Injectable } from '@nestjs/common';
import { CreateChildInput } from './dto/create-child.input';
import { UpdateChildInput } from './dto/update-child.input';
import { PaginateChildrenInput } from './dto/paginate-children.input';
import { InjectRepository } from '@nestjs/typeorm';
import { Child } from './entities/child.entity';
import { DataSource, Repository } from 'typeorm';
import { buildPaginator } from 'typeorm-cursor-pagination';
import { Camp } from 'src/camp/entities/camp.entity';

@Injectable()
export class ChildService {
  constructor(
    @InjectRepository(Child) private readonly repo: Repository<Child>,
    private dataSource: DataSource,
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

  async paginate(input: PaginateChildrenInput) {
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

    if (input.parentId) {
      queryBuilder.andWhere('child.parentId = :parentId', {
        parentId: input.parentId,
      });
    }

    if (input.name) {
      queryBuilder.andWhere('child.name = :name', {
        name: `%${input.name}%`,
      });
    }

    if (input.campId) {
      const camp = await this.dataSource.manager.findOne(Camp, {
        where: { id: input.campId },
        relations: ['ageRanges'],
      });
      if (camp) {
        // based on current time and age ranges, get min and max birthdates for children
        const now = new Date();
        const minBirthDate = new Date(now);
        const maxBirthDate = new Date(now);
        for (const ageRange of camp.ageRanges) {
          if (
            ageRange.minAge <
            minBirthDate.getFullYear() - now.getFullYear()
          ) {
            minBirthDate.setFullYear(
              minBirthDate.getFullYear() - ageRange.minAge,
            );
          }
          if (ageRange.maxAge) {
            maxBirthDate.setFullYear(
              maxBirthDate.getFullYear() - ageRange.maxAge,
            );
          }
        }
      }
    }

    return paginator.paginate(queryBuilder);
  }
}
