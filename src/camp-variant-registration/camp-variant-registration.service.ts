import { Injectable } from '@nestjs/common';
import { CreateCampVariantRegistrationInput } from './dto/create-camp-variant-registration.input';
import { UpdateCampVariantRegistrationInput } from './dto/update-camp-variant-registration.input';
import { InjectRepository } from '@nestjs/typeorm';
import { CampVariantRegistration } from './entities/camp-variant-registration.entity';
import { In, Repository } from 'typeorm';
import { PaginateCampVariantRegistrationsInput } from './dto/paginate-camp-variant-registrations.input';
import { buildPaginator } from 'typeorm-cursor-pagination';

@Injectable()
export class CampVariantRegistrationService {
  constructor(
    @InjectRepository(CampVariantRegistration)
    private repo: Repository<CampVariantRegistration>,
  ) {}

  create(
    createCampVariantRegistrationInput: CreateCampVariantRegistrationInput,
  ) {
    return 'This action adds a new campVariantRegistration';
  }

  findAll() {
    return `This action returns all campVariantRegistration`;
  }

  findOne(id: number) {
    return `This action returns a #${id} campVariantRegistration`;
  }

  update(
    id: number,
    updateCampVariantRegistrationInput: UpdateCampVariantRegistrationInput,
  ) {
    return `This action updates a #${id} campVariantRegistration`;
  }

  remove(id: number) {
    return `This action removes a #${id} campVariantRegistration`;
  }

  findCampVariantsRegistrationsByCampId(keys: readonly number[]) {
    return this.repo.find({ where: { campRegistrationId: In(keys) } });
  }

  paginate(input: PaginateCampVariantRegistrationsInput) {
    const queryBuilder = this.repo.createQueryBuilder(
      'campVariantRegistration',
    );
    queryBuilder.innerJoinAndSelect('campVariantRegistration.child', 'child');
    queryBuilder.leftJoinAndSelect(
      'campVariantRegistration.campRegistration',
      'campRegistration',
    );

    if (input.campIds) {
      queryBuilder.andWhere('campRegistration.campId IN (:...campIds)', {
        campIds: input.campIds,
      });
    }

    if (input.childIds) {
      queryBuilder.andWhere(
        'campVariantRegistration.childId IN (:...childIds)',
        {
          childIds: input.childIds,
        },
      );
    }

    if (input.parentIds) {
      queryBuilder.andWhere('campRegistration.parentId IN (:...parentIds)', {
        parentIds: input.parentIds,
      });
    }

    if (input.campVariantIds) {
      queryBuilder.andWhere(
        'campVariantRegistration.campVariantId IN (:...campVariantIds)',
        {
          campVariantIds: input.campVariantIds,
        },
      );
    }

    if (input.statuses) {
      queryBuilder.andWhere('campRegistration.status IN (:...statuses)', {
        statuses: input.statuses,
      });
    }

    if (input.withMeal === true) {
      queryBuilder.andWhere('campVariantRegistration.mealPrice IS NOT NULL');
    } else if (input.withMeal === false) {
      queryBuilder.andWhere('campVariantRegistration.mealPrice IS NULL');
    }

    if (input.withShirt === true) {
      queryBuilder.andWhere('campVariantRegistration.shirtSize IS NOT NULL');
    } else if (input.withShirt === false) {
      queryBuilder.andWhere('campVariantRegistration.shirtSize IS NULL');
    }

    const paginator = buildPaginator({
      entity: CampVariantRegistration,
      alias: 'campVariantRegistration',
      paginationKeys: ['createdAt', 'id'],
      query: {
        ...input,
        order: input.isAsc ? 'ASC' : 'DESC',
      },
    });

    return paginator.paginate(queryBuilder);
  }
}
