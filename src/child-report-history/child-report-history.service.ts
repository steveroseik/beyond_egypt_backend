import { Injectable } from '@nestjs/common';
import { CreateChildReportHistoryInput } from './dto/create-child-report-history.input';
import { UpdateChildReportHistoryInput } from './dto/update-child-report-history.input';

@Injectable()
export class ChildReportHistoryService {
  create(createChildReportHistoryInput: CreateChildReportHistoryInput) {
    return 'This action adds a new childReportHistory';
  }

  findAll() {
    return `This action returns all childReportHistory`;
  }

  findOne(id: number) {
    return `This action returns a #${id} childReportHistory`;
  }

  update(id: number, updateChildReportHistoryInput: UpdateChildReportHistoryInput) {
    return `This action updates a #${id} childReportHistory`;
  }

  remove(id: number) {
    return `This action removes a #${id} childReportHistory`;
  }
}
