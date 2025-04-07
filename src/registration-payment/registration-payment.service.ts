import { Injectable } from '@nestjs/common';
import { CreateRegistrationPaymentHistoryInput } from './dto/create-registration-payment.input';
import { UpdateRegistrationPaymentHistoryInput } from './dto/update-registration-payment.input';
import { InjectRepository } from '@nestjs/typeorm';
import { RegistrationPayment } from './entities/registration-payment.entity';
import { DataSource, Repository } from 'typeorm';
import { PaginateRegistrationPaymentsInput } from './dto/paginate-registration-payments.input';
import { buildPaginator } from 'typeorm-cursor-pagination';

@Injectable()
export class RegistrationPaymentHistoryService {
  constructor(
    @InjectRepository(RegistrationPayment)
    private repo: Repository<RegistrationPayment>,
    private dataSource: DataSource,
  ) {}

  create(
    createRegistrationPaymentHistoryInput: CreateRegistrationPaymentHistoryInput,
  ) {
    return 'This action adds a new registrationPaymentHistory';
  }

  findAll() {
    return `This action returns all registrationPaymentHistory`;
  }

  findOne(id: number) {
    return `This action returns a #${id} registrationPaymentHistory`;
  }

  update(
    id: number,
    updateRegistrationPaymentHistoryInput: UpdateRegistrationPaymentHistoryInput,
  ) {
    return `This action updates a #${id} registrationPaymentHistory`;
  }

  remove(id: number) {
    return `This action removes a #${id} registrationPaymentHistory`;
  }

  paginate(input: PaginateRegistrationPaymentsInput) {
    try {
      const queryBuilder = this.repo.createQueryBuilder('registrationPayment');

      if (input.userId) {
        queryBuilder.andWhere('campRegistration.userId = :userId', {
          userId: input.userId,
        });
      }

      if (input.campRegistrationId) {
        queryBuilder.andWhere(
          'registrationPayment.campRegistrationId = :campRegistrationId',
          { campRegistrationId: input.campRegistrationId },
        );
      }

      if (input.paymentMethods?.length) {
        queryBuilder.andWhere(
          'registrationPayment.paymentMethod IN (:...paymentMethods)',
          {
            paymentMethods: input.paymentMethods,
          },
        );
      }

      if (input.statuses?.length) {
        queryBuilder.andWhere('registrationPayment.status IN (:...statuses)', {
          statuses: input.statuses,
        });
      }

      if (input.search) {
        queryBuilder.andWhere(
          'registrationPayment.referenceNumber LIKE :search OR registrationPayment.amount LIKE :search OR registrationPayment.url LIKE :search',
          {
            search: `%${input.search}%`,
          },
        );
      }

      const paginator = buildPaginator({
        entity: RegistrationPayment,
        paginationKeys: ['createdAt', 'id'],
        alias: 'registrationPayment',
        query: {
          ...input,
          order: input.isAsc ? 'ASC' : 'DESC',
        },
      });

      return paginator.paginate(queryBuilder);
    } catch (e) {
      console.log(e);
      return {
        success: false,
        message: e ?? 'Error while paginating registration payments',
      };
    }
  }
}
