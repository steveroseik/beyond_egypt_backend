import { Injectable } from '@nestjs/common';
import { CreateChildReportHistoryInput } from './dto/create-child-report-history.input';
import { UpdateChildReportHistoryInput } from './dto/update-child-report-history.input';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ChildReportHistory } from './entities/child-report-history.entity';
import { ChildReport } from 'src/child-report/entities/child-report.entity';

@Injectable()
export class ChildReportHistoryService {
  constructor(
    @InjectRepository(ChildReportHistory)
    private repo: Repository<ChildReportHistory>,
    private dataSource: DataSource,
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
      console.log(e);
      return {
        success: false,
        message: e.message ?? 'Failed to create child report history',
      };
    } finally {
      await queryRunner.release();
    }
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
