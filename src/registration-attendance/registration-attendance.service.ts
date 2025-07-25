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
import { parseCampRegCode } from 'support/helpers/camp-reg-code.mini';

@Injectable()
export class RegistrationAttendanceService {
  constructor(
    @InjectRepository(RegistrationAttendance)
    private repo: Repository<RegistrationAttendance>,
    private campRegistrationService: CampRegistrationService,
    // private encryptionService: EncryptionService,
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

  async leave(id: number, auditorId: string, leaveTime?: Date) {
    const updatedAttendance = await this.repo.update(
      {
        id,
      },
      {
        leaveTime: leaveTime ? leaveTime : () => 'CURRENT_TIMESTAMP(3)',
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
    campRegistrationId: number,
    parentPartialId: string,
  ): Promise<{
    campRegistration: CampRegistration;
    remainingAttendances: number;
  }> {
    const campRegistration = await this.dataSource.manager.findOne(
      CampRegistration,
      {
        where: { id: campRegistrationId },
        relations: [
          'campVariantRegistrations',
          'campVariantRegistrations.campVariant',
        ],
      },
    );

    if (
      !campRegistration ||
      campRegistration.parentId.substring(0, 2).toUpperCase() !==
        parentPartialId.toUpperCase()
    ) {
      throw new Error('Camp registration not found');
    }

    if (campRegistration.status !== CampRegistrationStatus.accepted) {
      throw new Error('Invalid camp registration');
    }

    if (!campRegistration.campVariantRegistrations?.length) {
      throw new Error('No camp variants registered for this camp registration');
    }

    const existingAttendance =
      await this.findAttendanceCount(campRegistrationId);

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
      remainingAttendances: max([remaining, 0]),
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
    parentPartialId: string;
    campRegistrationId: number;
  }> {
    const {
      parentPartialId,
      campRegistrationId,
    }: {
      parentPartialId: string;
      campRegistrationId: number;
    } = parseCampRegCode(token);

    if (!parentPartialId || !campRegistrationId) {
      throw new Error('Invalid attendance token 1.0');
    }

    return {
      parentPartialId,
      campRegistrationId,
    };
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
      const { parentPartialId, campRegistrationId } =
        await this.validateToken(token);

      const campRegistration = await this.dataSource.manager.findOne(
        CampRegistration,
        {
          where: { id: campRegistrationId },
        },
      );

      if (
        !campRegistration ||
        campRegistration.parentId.substring(0, 2).toUpperCase() !==
          parentPartialId.toUpperCase()
      ) {
        return {
          success: false,
          message: 'Camp registration not found',
        };
      }

      const parentId = campRegistration.parentId;

      const attendances = await this.repo
        .createQueryBuilder('ra')
        .innerJoinAndSelect('ra.child', 'child')
        .where('ra.campRegistrationId = :campRegistrationId', {
          campRegistrationId,
        })
        .andWhere('ra.campVariantId = :campVariantId', { campVariantId })
        .andWhere('child.parentId = :parentId', { parentId })
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
