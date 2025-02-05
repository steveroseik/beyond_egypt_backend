import { Injectable } from '@nestjs/common';
import { CreateChildReportInput } from './dto/create-child-report.input';
import { UpdateChildReportInput } from './dto/update-child-report.input';

@Injectable()
export class ChildReportService {
  create(createChildReportInput: CreateChildReportInput) {
    return 'This action adds a new childReport';
  }

  findAll() {
    return `This action returns all childReport`;
  }

  findOne(id: number) {
    return `This action returns a #${id} childReport`;
  }

  update(id: number, updateChildReportInput: UpdateChildReportInput) {
    return `This action updates a #${id} childReport`;
  }

  remove(id: number) {
    return `This action removes a #${id} childReport`;
  }
}
