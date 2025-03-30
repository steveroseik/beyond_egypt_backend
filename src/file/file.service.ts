import { Injectable } from '@nestjs/common';
import { CreateFileInput } from './dto/create-file.input';
import { UpdateFileInput } from './dto/update-file.input';
import { InjectRepository } from '@nestjs/typeorm';
import { File } from './entities/file.entity';
import { DataSource, In, Repository } from 'typeorm';
import { AwsBucketService } from 'src/aws-bucket/aws-bucket.service';

@Injectable()
export class FileService {
  constructor(
    @InjectRepository(File) private repo: Repository<File>,
    private dataSource: DataSource,
    private awsService: AwsBucketService,
  ) {}

  create(createFileInput: CreateFileInput) {
    return 'This action adds a new file';
  }

  findAll() {
    return `This action returns all file`;
  }

  findOne(id: number) {
    return `This action returns a #${id} file`;
  }

  findAllByKeys(keys: readonly number[]) {
    return this.repo.find({ where: { id: In(keys) } });
  }

  update(id: number, updateFileInput: UpdateFileInput) {
    return `This action updates a #${id} file`;
  }

  async remove(id: number) {
    const file = await this.repo.findOne({ where: { id } });
    if (!file) {
      return {
        success: false,
        message: 'File not found',
      };
    }

    const deleteFromAws = await this.awsService.deleteFile(file.key);
    if (!deleteFromAws.success)
      return {
        success: false,
        message: 'Error deleting file from cloud',
      };

    const result = await this.repo.delete(id);

    if (!result.affected) {
      return {
        success: false,
        message: 'Error deleting file from database',
      };
    }

    return {
      success: true,
      message: 'File deleted successfully',
    };
  }

  findFilesByCampIds(keys: readonly number[]) {
    return this.repo
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.camps', 'camp')
      .where('camp.id IN (:...keys)', { keys })
      .getMany();
  }

  findFilesByEventIds(keys: readonly number[]) {
    return this.repo
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.events', 'event')
      .where('event.id IN (:...keys)', { keys })
      .getMany();
  }
}
