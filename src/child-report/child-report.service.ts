import { Injectable } from '@nestjs/common';
import { CreateChildReportInput } from './dto/create-child-report.input';
import { UpdateChildReportInput } from './dto/update-child-report.input';
import { InjectRepository } from '@nestjs/typeorm';
import { ChildReport } from './entities/child-report.entity';
import { DataSource, Repository } from 'typeorm';
import { ChildReportHistory } from 'src/child-report-history/entities/child-report-history.entity';

@Injectable()
export class ChildReportService {
  constructor(
    @InjectRepository(ChildReport) private repo: Repository<ChildReport>,
    private dataSource: DataSource,
  ) {}

  async create(input: CreateChildReportInput) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    await queryRunner.startTransaction();

    try {
      const createReport = await queryRunner.manager.insert(ChildReport, input);

      if (createReport.raw.affectedRows === 0) {
        throw new Error('Failed to create child report');
      }

      input.details.childReportId = createReport.raw.insertId;

      const createHistory = await queryRunner.manager.insert(
        ChildReportHistory,
        input.details,
      );

      if (createHistory.raw.affectedRows === 0) {
        throw new Error('Failed to create child report history');
      }

      await queryRunner.commitTransaction();
      return {
        success: true,
        message: 'Child report created successfully',
      };
    } catch (e) {
      await queryRunner.rollbackTransaction();
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
    return `This action returns a #${id} childReport`;
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
}
