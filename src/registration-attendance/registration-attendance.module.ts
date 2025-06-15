import { Module } from '@nestjs/common';
import { RegistrationAttendanceService } from './registration-attendance.service';
import { RegistrationAttendanceResolver } from './registration-attendance.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistrationAttendance } from './entities/registration-attendance.entity';
import { CampRegistrationModule } from 'src/camp-registration/camp-registration.module';
import { EncryptionModule } from 'src/encryption/encryption.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RegistrationAttendance]),
    CampRegistrationModule,
    EncryptionModule,
  ],
  providers: [RegistrationAttendanceResolver, RegistrationAttendanceService],
  exports: [RegistrationAttendanceService],
})
export class RegistrationAttendanceModule {}
