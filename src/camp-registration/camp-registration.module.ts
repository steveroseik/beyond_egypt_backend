import { Module } from '@nestjs/common';
import { CampRegistrationService } from './camp-registration.service';
import { CampRegistrationResolver } from './camp-registration.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampRegistration } from './entities/camp-registration.entity';
import { AwsBucketModule } from 'src/aws-bucket/aws-bucket.module';
import { MailModule } from 'src/mail/mail.module';
import { EncryptionModule } from 'src/encryption/encryption.module';
import { RegistrationAttendance } from 'src/registration-attendance/entities/registration-attendance.entity';
import { RegistrationAttendanceModule } from 'src/registration-attendance/registration-attendance.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CampRegistration]),
    AwsBucketModule,
    MailModule,
    EncryptionModule,
  ],
  providers: [CampRegistrationResolver, CampRegistrationService],
  exports: [CampRegistrationService],
})
export class CampRegistrationModule {}
