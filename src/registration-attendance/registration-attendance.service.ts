import { Injectable } from '@nestjs/common';
import { CreateRegistrationAttendanceInput } from './dto/create-registration-attendance.input';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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
    // Check if there are any existing active attendance records for these children
    const existingAttendances = await this.repo.find({
      where: {
        campRegistrationId: input.campRegistrationId,
        campVariantId: input.campVariantId,
        childId: In(input.childIds),
        leaveTime: null,
      },
    });

    if (existingAttendances.length > 0) {
      return {
        success: false,
        message: 'Some children already have active attendance records',
        data: existingAttendances[0],
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

    if (
      currentAttendances + input.childIds.length >
      campRegistration.capacity
    ) {
      return {
        success: false,
        message: 'Camp has reached maximum capacity for today',
      };
    }

    // Create attendance records for all children
    const attendances = await Promise.all(
      input.childIds.map((childId) =>
        this.repo.save({
          campRegistrationId: input.campRegistrationId,
          campVariantId: input.campVariantId,
          childId,
          enterTime: new Date(),
          enterAuditorId: auditorId,
        }),
      ),
    );

    return {
      success: true,
      message: 'Attendance recorded successfully for all children',
      data: attendances[0], // Return first record as reference
    };
  }

  async leave(
    attendanceIds: number[],
    auditorId: string,
  ): Promise<AttendanceResponse> {
    // Find all active attendance records
    const attendances = await this.repo.find({
      where: {
        id: In(attendanceIds),
        leaveTime: null,
      },
    });

    if (attendances.length === 0) {
      return {
        success: false,
        message: 'No active attendance records found',
      };
    }

    if (attendances.length !== attendanceIds.length) {
      return {
        success: false,
        message:
          'Some attendance records were not found or are already completed',
      };
    }

    // Update all attendance records with leave time
    const updatedAttendances = await Promise.all(
      attendances.map((attendance) =>
        this.repo.save({
          ...attendance,
          leaveTime: new Date(),
          leaveAuditorId: auditorId,
        }),
      ),
    );

    return {
      success: true,
      message: 'Leave time recorded successfully for all children',
      data: updatedAttendances[0], // Return first record as reference
    };
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
