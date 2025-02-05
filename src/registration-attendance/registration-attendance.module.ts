import { Module } from '@nestjs/common';
import { RegistrationAttendanceService } from './registration-attendance.service';
import { RegistrationAttendanceResolver } from './registration-attendance.resolver';

@Module({
  providers: [RegistrationAttendanceResolver, RegistrationAttendanceService],
})
export class RegistrationAttendanceModule {}
