import { Injectable } from '@nestjs/common';
import { CreateChildReportHistoryInput } from './dto/create-child-report-history.input';
import { UpdateChildReportHistoryInput } from './dto/update-child-report-history.input';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ChildReportHistory } from './entities/child-report-history.entity';
import { ChildReport } from 'src/child-report/entities/child-report.entity';
import { PaginateChildReportHistoryInput } from './dto/paginate-child-report-history.input';
import { buildPaginator } from 'typeorm-cursor-pagination';
import { File } from 'src/file/entities/file.entity';
import { FileService } from 'src/file/file.service';

@Injectable()
export class ChildReportHistoryService {
  constructor(
    @InjectRepository(ChildReportHistory)
    private repo: Repository<ChildReportHistory>,
    private dataSource: DataSource,
    private fileService: FileService,
  ) {}

  async create(input: CreateChildReportHistoryInput) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const createHistory = await queryRunner.manager.insert(
        ChildReportHistory,
        input,
      );

      if (createHistory.raw.affectedRows === 0) {
        throw new Error('Failed to create child report history');
      }

      // Add files if provided
      if (input.fileIds?.length ?? false) {
        const files = await queryRunner.manager.count(File, {
          where: {
            id: In(input.fileIds),
          },
        });

        if (files !== input.fileIds?.length) {
          throw new Error('Some files not found');
        }

        await queryRunner.manager
          .createQueryBuilder(ChildReportHistory, 'history')
          .relation(ChildReportHistory, 'files')
          .of(createHistory.raw.insertId)
          .add(input.fileIds);
      }

      const updateReportStatus = await queryRunner.manager.update(
        ChildReport,
        { id: input.childReportId },
        { status: input.status },
      );

      if (updateReportStatus.affected === 0) {
        throw new Error('Failed to update child report status');
      }

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Child report history created successfully',
      };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      if (input.fileIds?.length) {
        input.fileIds.forEach(async (fileId) => {
          this.fileService.remove(fileId);
        });
      }
      console.log(e);
      return {
        success: false,
        message: e.message ?? 'Failed to create child report history',
      };
    } finally {
      await queryRunner.release();
    }
  }

  async paginate(input: PaginateChildReportHistoryInput) {
    const queryBuilder = this.repo
      .createQueryBuilder('childReportHistory')
      .where('childReportHistory.childReportId = :childReportId', {
        childReportId: input.childReportId,
      });

    const paginator = buildPaginator({
      entity: ChildReportHistory,
      alias: 'childReportHistory',
      paginationKeys: ['createdAt', 'id'],
      query: {
        ...input,
        order: input.isAsc ? 'ASC' : 'DESC',
      },
    });
  }

  async findLatestByChildReportIds(
    keys: readonly number[],
  ): Promise<ChildReportHistory[]> {
    if (!keys.length) return [];

    // Fetch the latest ChildReportHistory for each childReportId in a single query
    const subQuery = this.repo
      .createQueryBuilder('h')
      .select([
        'h.childReportId AS "childReportId"',
        'MAX(h.createdAt) AS "maxCreatedAt"',
      ])
      .where('h.childReportId IN (:...keys)', { keys })
      .groupBy('h.childReportId');

    const latestHistories = await this.repo
      .createQueryBuilder('childReportHistory')
      .innerJoin(
        '(' + subQuery.getQuery() + ')',
        'latest',
        'childReportHistory.childReportId = latest.childReportId AND childReportHistory.createdAt = latest.maxCreatedAt',
      )
      .setParameters(subQuery.getParameters())
      .getMany();

    return latestHistories;
  }

  findAll() {
    return `This action returns all childReportHistory`;
  }

  findOne(id: number) {
    return `This action returns a #${id} childReportHistory`;
  }

  update(
    id: number,
    updateChildReportHistoryInput: UpdateChildReportHistoryInput,
  ) {
    return `This action updates a #${id} childReportHistory`;
  }

  remove(id: number) {
    return `This action removes a #${id} childReportHistory`;
  }
}
