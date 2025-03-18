import { Module } from '@nestjs/common';
import { RegistrationAttendanceService } from './registration-attendance.service';
import { RegistrationAttendanceResolver } from './registration-attendance.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistrationAttendance } from './entities/registration-attendance.entity';
import { CampRegistration } from 'src/camp-registration/entities/camp-registration.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RegistrationAttendance, CampRegistration]),
  ],
  providers: [RegistrationAttendanceResolver, RegistrationAttendanceService],
  exports: [RegistrationAttendanceService],
})
export class RegistrationAttendanceModule {}
