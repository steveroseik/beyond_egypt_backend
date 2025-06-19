import { Injectable } from '@nestjs/common';
import { CreateChildReportInput } from './dto/create-child-report.input';
import { UpdateChildReportInput } from './dto/update-child-report.input';
import { InjectRepository } from '@nestjs/typeorm';
import { ChildReport } from './entities/child-report.entity';
import { DataSource, In, Repository } from 'typeorm';
import { ChildReportHistory } from 'src/child-report-history/entities/child-report-history.entity';
import { PaginateChildReportsInput } from './dto/paginate-child-reports.input';
import { UserType } from 'support/enums';
import { buildPaginator } from 'typeorm-cursor-pagination';
import { File } from 'src/file/entities/file.entity';
import { FileService } from 'src/file/file.service';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class ChildReportService {
  constructor(
    @InjectRepository(ChildReport) private repo: Repository<ChildReport>,
    private dataSource: DataSource,
    private fileService: FileService,
    private readonly mailService: MailService,
  ) {}

  async create(input: CreateChildReportInput) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    await queryRunner.startTransaction();

    try {
      const newReport = await queryRunner.manager.save(ChildReport, {
        childId: input.childId,
        campVariantId: input.campVariantId,
        type: input.type,
        status: input.status,
      });

      if (!newReport) {
        throw new Error('Failed to create child report');
      }

      const latestHistory = await queryRunner.manager.save(ChildReportHistory, {
        childReportId: newReport.id,
        details: input.details.details,
        reporterId: input.details.reporterId,
        status: input.status,
        reportTime: input.details.reportTime,
        gameName: input.details.gameName,
        actionsTaken: input.details.actionsTaken,
      });

      if (!latestHistory) {
        throw new Error('Failed to create child report history');
      }

      if (input.details.fileIds?.length) {
        const filesCount = await queryRunner.manager.count(File, {
          where: {
            id: In(input.details.fileIds),
          },
        });
        if (filesCount !== input.details.fileIds.length) {
          throw new Error('Some files not found');
        }

        await queryRunner.manager
          .createQueryBuilder(ChildReportHistory, 'history')
          .relation(ChildReportHistory, 'files')
          .of(latestHistory.id)
          .add(input.details.fileIds);
      }

      await queryRunner.commitTransaction();

      this.mailService.sendReportEmail({
        childReport: newReport,
        latestHistory,
      });

      return {
        success: true,
        message: 'Child report created successfully',
      };
    } catch (e) {
      await queryRunner.rollbackTransaction();

      if (input.details.fileIds?.length) {
        input.details.fileIds.forEach(async (fileId) => {
          this.fileService.remove(fileId);
        });
      }
      console.log(e);
      return {
        success: false,
        message: e.message ?? 'Failed to create child report',
      };
    } finally {
      await queryRunner.release();
    }
  }

  findAll() {
    return `This action returns all childReport`;
  }

  findOne(id: number) {
    return this.repo.findOne({
      where: { id },
    });
  }

  async update(input: UpdateChildReportInput) {
    try {
      const updateReport = await this.repo.update(input.id, input);
      if (updateReport.affected === 0) {
        return {
          success: false,
          message: 'Failed to update child report',
        };
      }

      return {
        success: true,
        message: 'Child report updated successfully',
      };
    } catch (e) {
      console.log(e);
      return {
        success: false,
        message: e.message ?? 'Failed to update child report',
      };
    }
  }

  async remove(id: number) {
    const response = await this.repo.delete(id);

    if (response.affected === 0) {
      return {
        success: false,
        message: 'Failed to delete child report',
      };
    }

    return {
      success: true,
      message: 'Child report deleted successfully',
    };
  }

  paginate(
    input: PaginateChildReportsInput,
    userType: UserType,
    userId: string,
  ) {
    let parentId: string = undefined;
    if (userType === UserType.parent) {
      parentId = userId;
    }

    const queryBuilder = this.repo.createQueryBuilder('childReport');

    if (parentId) {
      queryBuilder
        .innerJoin('childReport.child', 'child')
        .where('child.parentId = :parentId', { parentId });
    }

    if (input.childId) {
      queryBuilder.andWhere('childReport.childId = :childId', {
        childId: input.childId,
      });
    }

    if (input.status) {
      queryBuilder.andWhere('childReport.status = :status', {
        status: input.status,
      });
    }

    if (input.campVariantId) {
      queryBuilder.andWhere('childReport.campVariantId = :campVariantId', {
        campVariantId: input.campVariantId,
      });
    }

    const paginator = buildPaginator({
      entity: ChildReport,
      alias: 'childReport',
      paginationKeys: ['createdAt', 'id'],
      query: {
        ...input,
        order: input.isAsc ? 'ASC' : 'DESC',
      },
    });

    return paginator.paginate(queryBuilder);
  }
}
