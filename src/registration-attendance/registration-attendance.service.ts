import { Injectable } from '@nestjs/common';
import { CreateRegistrationAttendanceInput } from './dto/create-registration-attendance.input';
import { UpdateRegistrationAttendanceInput } from './dto/update-registration-attendance.input';

@Injectable()
export class RegistrationAttendanceService {
  create(createRegistrationAttendanceInput: CreateRegistrationAttendanceInput) {
    return 'This action adds a new registrationAttendance';
  }

  findAll() {
    return `This action returns all registrationAttendance`;
  }

  findOne(id: number) {
    return `This action returns a #${id} registrationAttendance`;
  }

  update(id: number, updateRegistrationAttendanceInput: UpdateRegistrationAttendanceInput) {
    return `This action updates a #${id} registrationAttendance`;
  }

  remove(id: number) {
    return `This action removes a #${id} registrationAttendance`;
  }
}
