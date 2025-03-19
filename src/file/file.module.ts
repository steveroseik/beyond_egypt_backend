import { Module } from '@nestjs/common';
import { FileService } from './file.service';
import { FileResolver } from './file.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { File } from './entities/file.entity';
import { AwsBucketModule } from 'src/aws-bucket/aws-bucket.module';

@Module({
  imports: [TypeOrmModule.forFeature([File]), AwsBucketModule],
  providers: [FileResolver, FileService],
  exports: [FileService],
})
export class FileModule {}
