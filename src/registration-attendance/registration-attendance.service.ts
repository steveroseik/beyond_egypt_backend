import { Injectable } from '@nestjs/common';
import { CreateRegistrationAttendanceInput } from './dto/create-registration-attendance.input';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistrationAttendance } from './entities/registration-attendance.entity';
import { CampRegistration } from 'src/camp-registration/entities/camp-registration.entity';
import { AttendanceResponse } from './dto/attendance-response.type';

@Injectable()
export class RegistrationAttendanceService {
  constructor(
    @InjectRepository(RegistrationAttendance)
    private repo: Repository<RegistrationAttendance>,
    @InjectRepository(CampRegistration)
    private campRegistrationRepo: Repository<CampRegistration>,
  ) {}

  async enter(
    input: CreateRegistrationAttendanceInput,
    auditorId: string,
  ): Promise<AttendanceResponse> {
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

    // Get current active attendances count for this registration
    const currentAttendances = await this.repo.count({
      where: {
        campRegistrationId: input.campRegistrationId,
        //leaveTime: null,
      },
    });
    // Get camp registration to check capacity
    const campRegistration = await this.campRegistrationRepo.findOne({
      where: { id: input.campRegistrationId },
    });

    if (!campRegistration) {
      return {
        success: false,
        message: 'Camp registration not found',
      };
    }
    console.log('currentAttendances', currentAttendances);
    console.log('campRegistration.capacity', campRegistration);
    if (currentAttendances >= campRegistration.capacity) {
      return {
        success: false,
        message: 'Camp has reached maximum capacity for today',
      };
    }

    const attendance = await this.repo.save({
      ...input,
      enterTime: new Date(),
      enterAuditorId: auditorId,
    });

    return {
      success: true,
      message: 'Attendance recorded successfully',
      data: attendance,
    };
  }

  async leave(id: number, auditorId: string): Promise<AttendanceResponse> {
    const attendance = await this.findActiveAttendanceById(id);

    if (!attendance) {
      return {
        success: false,
        message: 'No active attendance record found',
      };
    }

    attendance.leaveTime = new Date();
    attendance.leaveAuditorId = auditorId;
    const updatedAttendance = await this.repo.save(attendance);

    return {
      success: true,
      message: 'Leave time recorded successfully',
      data: updatedAttendance,
    };
  }

  async findActiveAttendanceById(id: number) {
    return this.repo.findOne({
      where: { id, leaveTime: null },
    });
  }

  checkCampVariant(campVariantId: number) {
    return this.campRegistrationRepo.findOne({
      where: { id: campVariantId },
    });
  }

  checkChild(childId: number) {
    return this.campRegistrationRepo.findOne({
      where: { id: childId },
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
}
