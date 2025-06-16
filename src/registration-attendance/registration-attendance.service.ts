import { Injectable } from '@nestjs/common';
import { CreateRegistrationAttendanceInput } from './dto/create-registration-attendance.input';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { RegistrationAttendance } from './entities/registration-attendance.entity';
import { CampRegistration } from 'src/camp-registration/entities/camp-registration.entity';
import { PaginateRegistrationAttendanceInput } from './dto/paginate-registration-attendance.input';
import { buildPaginator } from 'typeorm-cursor-pagination';
import { CampVariant } from 'src/camp-variant/entities/camp-variant.entity';
import { CampRegistrationService } from 'src/camp-registration/camp-registration.service';
import { Child } from 'src/child/entities/child.entity';
import { EncryptionService } from 'src/encryption/encryption.service';
import { CampRegistrationStatus } from 'support/enums';
import { getDateDifferenceInDays } from 'support/helpers/days-diferrence.calculator';
import { max } from 'lodash';

@Injectable()
export class RegistrationAttendanceService {
  constructor(
    @InjectRepository(RegistrationAttendance)
    private repo: Repository<RegistrationAttendance>,
    private campRegistrationService: CampRegistrationService,
    private encryptionService: EncryptionService,
    private dataSource: DataSource,
  ) {}

  async enter(input: CreateRegistrationAttendanceInput, auditorId: string) {
    // Check if there's an existing active attendance record
    const existingAttendance = await this.repo.findOne({
      where: {
        campRegistrationId: input.campRegistrationId,
        campVariantId: input.campVariantId,
        childId: input.childId,
        leaveTime: null,
      },
    });

    if (existingAttendance) {
      return {
        success: false,
        message: 'Child already has an active attendance record',
        data: existingAttendance,
      };
    }

    const attendance = await this.repo.insert({
      ...input,
      enterTime: () => 'CURRENT_TIMESTAMP(3)',
      enterAuditorId: auditorId,
    });

    return {
      success: true,
      message: 'Attendance recorded successfully',
      data: {
        id: attendance.identifiers[0].id,
      },
    };
  }

  async leave(id: number, auditorId: string) {
    const updatedAttendance = await this.repo.update(
      {
        id,
      },
      {
        leaveTime: () => 'CURRENT_TIMESTAMP(3)',
        leaveAuditorId: auditorId,
      },
    );

    if (updatedAttendance.affected === 0) {
      return {
        success: false,
        message: 'No active attendance found for the given ID',
      };
    }

    return {
      success: true,
      message: 'Leave time recorded successfully',
    };
  }

  async findActiveAttendanceById(id: number) {
    return this.repo.findOne({
      where: { id, leaveTime: null },
    });
  }

  checkCampVariant(campVariantId: number) {
    return this.dataSource.manager.findOne(CampVariant, {
      where: { id: campVariantId },
    });
  }

  checkChild(childId: number, parentId: string) {
    return this.dataSource.manager.findOne(Child, {
      where: { id: childId, parentId },
    });
  }

  async findActiveAttendance(
    campRegistrationId: number,
    campVariantId: number,
    childId: number,
  ) {
    return this.repo.findOne({
      where: {
        campRegistrationId,
        campVariantId,
        childId,
        leaveTime: null,
      },
    });
  }

  async findRegistrationAndLimit(
    input: CreateRegistrationAttendanceInput,
    parentId: string,
  ): Promise<{
    campRegistration: CampRegistration;
    remainingAttendance: number;
  }> {
    const campRegistration = await this.dataSource.manager.findOne(
      CampRegistration,
      {
        where: { id: input.campRegistrationId, parentId },
        relations: [
          'campVariantRegistrations',
          'campVariantRegistrations.campVariant',
        ],
      },
    );

    if (!campRegistration) {
      throw new Error('Camp registration not found');
    }

    if (campRegistration.status !== CampRegistrationStatus.accepted) {
      throw new Error('Invalid camp registration');
    }

    if (!campRegistration.campVariantRegistrations?.length) {
      throw new Error('No camp variants registered for this camp registration');
    }

    const existingAttendance = await this.findAttendanceCount(
      input.campRegistrationId,
    );

    const remaining =
      campRegistration.campVariantRegistrations
        .map(
          (e) =>
            getDateDifferenceInDays(
              e.campVariant.startDate,
              e.campVariant.endDate,
            ) + 1,
        )
        .reduce((acc, count) => acc + count, 0) - existingAttendance;

    return {
      campRegistration,
      remainingAttendance: max([remaining, 0]),
    };
  }

  async findAttendanceCount(campRegistrationId: number) {
    return this.dataSource.manager.count(RegistrationAttendance, {
      where: {
        campRegistrationId,
      },
    });
  }

  async validateToken(token: string): Promise<{
    parentId: string;
    campRegistrationId: number;
  }> {
    const {
      parentId,
      campRegistrationId,
    }: {
      parentId: string;
      campRegistrationId: number;
    } = this.encryptionService.decrypt(token);

    if (!parentId || !campRegistrationId) {
      throw new Error('Invalid attendance token 1.0');
    }

    return {
      parentId,
      campRegistrationId,
    };
  }

  async getRemainingAttendances(parentId: string, campRegistrationId: number) {
    const campRegistration = await this.dataSource.manager.findOne(
      CampRegistration,
      {
        where: { id: campRegistrationId, parentId },
        relations: [
          'campVariantRegistrations',
          'campVariantRegistrations.campVariant',
        ],
      },
    );

    if (campRegistration.status !== CampRegistrationStatus.accepted) {
      throw Error('Invalid camp registration');
    }

    const existingAttendances = await this.dataSource.manager.count(
      RegistrationAttendance,
      {
        where: {
          campRegistrationId: campRegistration.id,
        },
      },
    );

    const remainingAttendances =
      campRegistration.campVariantRegistrations
        .map(
          (e) =>
            getDateDifferenceInDays(
              e.campVariant.startDate,
              e.campVariant.endDate,
            ) + 1,
        )
        .reduce((acc, count) => acc + count, 0) - existingAttendances;

    return max([remainingAttendances, 0]);
  }

  paginate(input: PaginateRegistrationAttendanceInput) {
    const queryBuilder = this.repo.createQueryBuilder('ra');

    if (input.childrenIds?.length) {
      queryBuilder.andWhere('ra.childId IN (:...childrenIds)', {
        childrenIds: input.childrenIds,
      });
    }

    if (input.campVariantIds?.length) {
      queryBuilder.andWhere('ra.campVariantId IN (:...campVariantIds', {
        campVariantIds: input.campVariantIds,
      });
    }

    if (input.parentIds?.length) {
      queryBuilder.innerJoin('ra.child', 'child');
    }

    const paginator = buildPaginator({
      entity: RegistrationAttendance,
      paginationKeys: ['createdAt', 'id'],
      alias: 'ra',
      query: {
        ...input,
        order: input.isAsc ? 'ASC' : 'DESC',
      },
    });

    return paginator.paginate(queryBuilder);
  }

  async validateAndFindAttendance(token: string, campVariantId: number) {
    try {
      const { parentId, campRegistrationId } = await this.validateToken(token);

      const attendances = await this.repo
        .createQueryBuilder('ra')
        .innerJoinAndSelect('ra.child', 'child')
        .where('ra.campRegistrationId = :campRegistrationId', {
          campRegistrationId,
        })
        .andWhere('ra.campVariantId = :campVariantId', { campVariantId })
        .andWhere('ra.child.parentId = :parentId', { parentId })
        .andWhere('ra.leaveTime IS NULL')
        .getMany();

      if (!attendances?.length) {
        return {
          success: false,
          message:
            'No active attendance found for the given token and camp variant',
        };
      }

      return {
        success: true,
        data: {
          parentId,
          campRegistrationId,
          attendances,
        },
      };
    } catch (e) {
      console.log(e);
      return {
        success: false,
        message: e.message ?? 'Error validating attendance token',
      };
    }
  }
}
